const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1080;
const DEFAULT_QUALITY = 0.86;

function isOptimizable(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export async function optimizeImageFile(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<File> {
  if (!isOptimizable(file) || typeof document === "undefined" || typeof createImageBitmap !== "function") return file;

  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options.quality ?? DEFAULT_QUALITY;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) return file;

    // Keep the original when conversion would make the payload larger.
    if (blob.size >= file.size && scale === 1 && file.type === "image/webp") return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

function canUseVercelOptimizer() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

export function optimizedImageUrl(src: string, width: number, quality = 80): string {
  if (!src || !canUseVercelOptimizer()) return src;
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${Math.max(64, Math.round(width))}&q=${Math.min(95, Math.max(40, Math.round(quality)))}`;
}

export function responsiveSrcSet(src: string, widths = [320, 640, 960, 1280, 1600], quality = 80): string | undefined {
  if (!src || !canUseVercelOptimizer() || src.startsWith("data:") || src.startsWith("blob:")) return undefined;
  return widths.map((w) => `${optimizedImageUrl(src, w, quality)} ${w}w`).join(", ");
}

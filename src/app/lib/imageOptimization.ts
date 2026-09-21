const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1080;
const DEFAULT_QUALITY = 0.86;

function isOptimizable(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export async function optimizeImageFile(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; cropToAspect?: boolean } = {},
): Promise<File> {
  if (!isOptimizable(file) || typeof document === "undefined" || typeof createImageBitmap !== "function") return file;

  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const cropToAspect = Boolean(options.cropToAspect);

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return file;

    let width: number;
    let height: number;

    if (cropToAspect) {
      width = Math.max(1, Math.round(maxWidth));
      height = Math.max(1, Math.round(maxHeight));
      canvas.width = width;
      canvas.height = height;

      const targetRatio = width / height;
      const sourceRatio = bitmap.width / bitmap.height;
      let sx = 0;
      let sy = 0;
      let sw = bitmap.width;
      let sh = bitmap.height;

      if (sourceRatio > targetRatio) {
        sw = Math.round(bitmap.height * targetRatio);
        sx = Math.round((bitmap.width - sw) / 2);
      } else if (sourceRatio < targetRatio) {
        sh = Math.round(bitmap.width / targetRatio);
        sy = Math.round((bitmap.height - sh) / 2);
      }
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
    } else {
      const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
      width = Math.max(1, Math.round(bitmap.width * scale));
      height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) return file;

    // Keep the original when conversion would make the payload larger.
    if (!cropToAspect && blob.size >= file.size && file.type === "image/webp" && bitmap.width === width && bitmap.height === height) return file;

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

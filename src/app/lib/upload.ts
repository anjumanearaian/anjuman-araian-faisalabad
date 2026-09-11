import { apiClient } from "./apiClient";
import { optimizeImageFile } from "./imageOptimization";

export async function uploadFile(file: File, category = "document"): Promise<string> {
  if (file.size > 12 * 1024 * 1024) throw new Error("File must be 12 MB or smaller.");

  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const prepared = isImage
    ? await optimizeImageFile(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.86 })
    : file;

  if (prepared.size > 4 * 1024 * 1024) {
    throw new Error(isImage
      ? "Image is still larger than 4 MB after optimization. Please use a smaller source image."
      : "File must be 4 MB or smaller.");
  }

  const formData = new FormData();
  formData.append("file", prepared);
  formData.append("category", category);
  const result = await apiClient<{ url: string }>("/upload", {
    method: "POST",
    body: formData,
  });
  if (!result?.url) throw new Error("Upload completed without a file URL");
  return result.url;
}

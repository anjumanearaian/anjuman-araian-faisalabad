import { apiClient } from "./apiClient";

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const result = await apiClient<{ url: string }>("/upload", {
    method: "POST",
    body: formData,
  });
  if (!result?.url) throw new Error("Upload completed without a file URL");
  return result.url;
}

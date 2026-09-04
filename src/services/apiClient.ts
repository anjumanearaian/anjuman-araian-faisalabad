const API_URL = import.meta.env.VITE_API_URL || "";

export async function apiRequest(path:string, options:RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error("API request failed");
  }

  return response.json();
}
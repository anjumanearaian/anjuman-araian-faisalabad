export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  public details?: Record<string, string[]>;
  constructor(message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.details = details;
  }
}

function getAuthToken() {
  // Members might store token in localStorage, Admins in sessionStorage
  return sessionStorage.getItem("araian_admin_token") || localStorage.getItem("araian_member_token") || null;
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Add JSON content type if not already set and not FormData
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If using FormData, let the browser set the Content-Type header with the boundary
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    let details: Record<string, string[]> | undefined;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      if (errorData.details) {
        details = errorData.details;
      }
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new ApiError(errorMessage, details);
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    // If response is not JSON, just return text as any (e.g. string)
    return text as any as T;
  }
}

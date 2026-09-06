export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  public details?: Record<string, string[]>;
  public status?: number;
  constructor(message: string, details?: Record<string, string[]>, status?: number) {
    super(message);
    this.name = "ApiError";
    this.details = details;
    this.status = status;
  }
}

function getAuthToken(endpoint: string) {
  if (["/members/me", "/members/register", "/members/login"].includes(endpoint) || (endpoint.startsWith("/forms/") && !endpoint.startsWith("/forms/admin/"))) {
    return localStorage.getItem("araian_member_token") || sessionStorage.getItem("araian_admin_token") || null;
  }
  // Members might store token in localStorage, Admins in sessionStorage
  return sessionStorage.getItem("araian_admin_token") || localStorage.getItem("araian_member_token") || null;
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken(endpoint);
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
    let errorMessage = `Request failed (HTTP ${response.status}).`;
    let details: Record<string, string[]> | undefined;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      if (errorData.details) {
        details = errorData.details;
      }
    } catch (e) {
      errorMessage = response.status === 404
        ? "Login API was not found (HTTP 404). Ask the administrator to deploy the updated backend."
        : `Server request failed (HTTP ${response.status}). Check deployment logs.`;
    }
    throw new ApiError(errorMessage, details, response.status);
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

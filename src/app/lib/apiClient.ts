// The frontend and backend are deployed together on the same Vercel project.
// Always use the same-origin /api prefix so preview/stale deployment URLs or an
// outdated VITE_API_URL cannot send requests to the wrong deployment.
export const API_BASE_URL = "/api";

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
  const memberFirst =
    ["/members/me", "/members/register", "/members/login", "/matrimonial/submit"].includes(endpoint) ||
    (endpoint.startsWith("/forms/") && !endpoint.startsWith("/forms/admin/")) ||
    (endpoint.startsWith("/matrimonial/match-requests") && !endpoint.startsWith("/matrimonial/match-requests/admin"));

  if (memberFirst) {
    return localStorage.getItem("araian_member_token") || sessionStorage.getItem("araian_admin_token") || null;
  }
  // Admin operations prefer the admin token. Member token remains a fallback for
  // endpoints that explicitly permit members.
  return sessionStorage.getItem("araian_admin_token") || localStorage.getItem("araian_member_token") || null;
}

function needsNestedProxy(endpoint: string) {
  const pathname = endpoint.split("?")[0];
  return pathname === "/content/published" ||
    /^\/content\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/leadership/") ||
    /^\/members\/[^/]+\/status$/.test(pathname);
}

function buildRequestUrl(endpoint: string) {
  if (!needsNestedProxy(endpoint)) return `${API_BASE_URL}${endpoint}`;

  const question = endpoint.indexOf("?");
  const pathname = question >= 0 ? endpoint.slice(0, question) : endpoint;
  const queryString = question >= 0 ? endpoint.slice(question + 1) : "";
  const encodedPath = pathname
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("__");
  return `${API_BASE_URL}/__proxy__${encodedPath}${queryString ? `?${queryString}` : ""}`;
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken(endpoint);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const requestUrl = buildRequestUrl(endpoint);
  const response = await fetch(requestUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (HTTP ${response.status}).`;
    let details: Record<string, string[]> | undefined;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      if (errorData.details) details = errorData.details;
    } catch {
      errorMessage = response.status === 404
        ? `API route ${requestUrl} was not found (HTTP 404).`
        : `Server request failed (HTTP ${response.status}). Check deployment logs.`;
    }
    throw new ApiError(errorMessage, details, response.status);
  }

  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as any as T;
  }
}

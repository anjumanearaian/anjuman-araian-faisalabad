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
    ["/members/me", "/members/register", "/members/login", "/matrimonial/submit", "/matrimonial/mine", "/messages/member-contact-request"].includes(endpoint) ||
    endpoint.startsWith("/matrimonial/published") ||
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
  // Vercel can resolve the single-segment API handlers directly, but nested
  // Express routes are not reliably matched as filesystem functions. Send every
  // multi-segment route through the catch-all proxy so forms, business submit,
  // matrimonial submit, admin form lists and other nested endpoints behave the
  // same on production, preview deployments and the future custom domain.
  return pathname.split("/").filter(Boolean).length > 1;
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

function friendlyStatusMessage(status: number, requestUrl: string) {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return `The requested service (${requestUrl}) is not available on this deployment.`;
  if (status === 409) return "This action conflicts with the current record. Refresh the page and try again.";
  if (status === 429) return "Too many requests were sent. Please wait a moment and try again.";
  if (status >= 500) return "The server could not complete this request. Please try again shortly.";
  return `Request failed (HTTP ${status}).`;
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
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the server. Check your internet connection and try again.",
      undefined,
      0,
    );
  }

  if (!response.ok) {
    let errorMessage = friendlyStatusMessage(response.status, requestUrl);
    let details: Record<string, string[]> | undefined;
    try {
      const errorData = await response.json();
      if (typeof errorData?.error === "string" && errorData.error.trim()) {
        errorMessage = errorData.error;
      }
      if (errorData?.details) details = errorData.details;
    } catch {
      // Keep the safe, user-facing status message above when the backend did not
      // return JSON (for example a platform error page or stale deployment).
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

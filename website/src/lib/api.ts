import { apiBaseUrl } from "./config";

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const authData =
    typeof window !== "undefined"
      ? localStorage.getItem("farmstaygo_customer_auth")
      : null;
  let authHeader: Record<string, string> = {};
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      const token = parsed?.data?.token;
      if (token) {
        authHeader = { Authorization: `Bearer ${token}` };
      }
    } catch {
      // Ignore invalid auth data
    }
  }

  const response = await fetch(
    `${apiBaseUrl}${normalizedPath}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
        ...authHeader,
        ...options.headers,
      },
      cache: options.cache ?? "no-store",
    }
  );

  if (!response.ok) {
    let message = "Unable to complete the request.";

    try {
      const errorBody = (await response.json()) as {
        message?: string;
      };

      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // Keep the fallback message when the API does not return JSON.
    }

    throw new ApiRequestError(
      message,
      response.status
    );
  }

  return (await response.json()) as T;
}

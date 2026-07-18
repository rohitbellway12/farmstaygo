const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

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

  const response = await fetch(
    `${apiBaseUrl}${normalizedPath}`,
    {
      ...options,
      headers: {
        Accept: "application/json",
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

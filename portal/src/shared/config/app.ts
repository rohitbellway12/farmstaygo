const trimTrailingSlashes = (value: string): string => {
  return value.replace(/\/+$/, "");
};

const apiPathPattern = /\/api\/?$/;

const resolveDefaultBackendUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.endsWith("farmstaygo.com")) {
      return "https://api.farmstaygo.com";
    }
  }
  return "http://localhost:5000";
};

const rawBackendUrl =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(apiPathPattern, "") ||
  resolveDefaultBackendUrl();

export const backendBaseUrl = trimTrailingSlashes(
  typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    rawBackendUrl.startsWith("http://") &&
    !rawBackendUrl.includes("localhost") &&
    !rawBackendUrl.includes("127.0.0.1")
    ? rawBackendUrl.replace(/^http:\/\//i, "https://")
    : rawBackendUrl
);

export const apiBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_API_URL ||
    `${backendBaseUrl}/api`
);

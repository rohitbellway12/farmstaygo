const resolveDefaultBackend = (): string => {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("farmstaygo.com")) {
    return "https://api.farmstaygo.com";
  }
  return "http://localhost:5000";
};

const resolveDefaultPortal = (): string => {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("farmstaygo.com")) {
    return "https://portal.farmstaygo.com";
  }
  return "http://localhost:5173";
};

let rawBackend = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  resolveDefaultBackend()
).replace(/\/+$/, "");

if (
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  rawBackend.startsWith("http://") &&
  !rawBackend.includes("localhost") &&
  !rawBackend.includes("127.0.0.1")
) {
  rawBackend = rawBackend.replace(/^http:\/\//i, "https://");
}

const backendBaseUrl = rawBackend;

let rawApi = (
  process.env.NEXT_PUBLIC_API_URL || `${backendBaseUrl}/api`
).replace(/\/+$/, "");

if (
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  rawApi.startsWith("http://") &&
  !rawApi.includes("localhost") &&
  !rawApi.includes("127.0.0.1")
) {
  rawApi = rawApi.replace(/^http:\/\//i, "https://");
}

const apiBaseUrl = rawApi;

const portalUrl = (
  process.env.NEXT_PUBLIC_PORTAL_URL || resolveDefaultPortal()
).replace(/\/+$/, "");

export { apiBaseUrl, backendBaseUrl, portalUrl };


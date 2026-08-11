const backendBaseUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || `${backendBaseUrl}/api`
).replace(/\/+$/, "");

const portalUrl = (
  process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:5173"
).replace(/\/+$/, "");

export { apiBaseUrl, backendBaseUrl, portalUrl };

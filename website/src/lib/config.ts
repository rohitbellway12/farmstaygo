const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const backendBaseUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const portalUrl = (
  process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:5173"
).replace(/\/+$/, "");

export { apiBaseUrl, backendBaseUrl, portalUrl };

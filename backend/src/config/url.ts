import type { Request } from "express";

export const trimTrailingSlashes = (
  value: string
): string => {
  return value.replace(/\/+$/, "");
};

export const buildUrl = (
  baseUrl: string,
  path: string
): string => {
  const normalizedBase = trimTrailingSlashes(baseUrl);
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
};

export const getBackendBaseUrl = (
  req?: Request
): string => {
  if (process.env.BACKEND_URL) {
    return trimTrailingSlashes(process.env.BACKEND_URL);
  }

  if (req) {
    const host = req.get("host") || "localhost:5000";
    const isLocalhost =
      host.startsWith("localhost") || host.startsWith("127.0.0.1");

    if (isLocalhost) {
      return `http://${host}`;
    }

    // Behind reverse proxy, check req.protocol, secure, or x-forwarded-proto
    const forwardedProto = req.headers["x-forwarded-proto"];
    const protoHeader = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : typeof forwardedProto === "string"
        ? forwardedProto.split(",")[0].trim()
        : null;

    const protocol =
      protoHeader ||
      (req.secure ? "https" : null) ||
      (req.protocol === "https" ? "https" : null) ||
      "https"; // Non-localhost domains in production should default to https

    return `${protocol}://${host}`;
  }

  const port = Number(process.env.PORT) || 5000;

  return `http://localhost:${port}`;
};

export const resolveAssetUrl = (
  url: string | null | undefined,
  req?: Request
): string | null => {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const baseUrl = getBackendBaseUrl(req);
  const isBaseLocalhost =
    baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return trimmed;
    }

    if (isBaseLocalhost) {
      return trimmed.replace("https://", "http://");
    }

    // Live/non-localhost: upgrade any http:// pointing to our backend or in general
    return trimmed.replace(/^http:\/\//i, "https://");
  }

  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl}${normalizedPath}`;
};


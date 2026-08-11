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
    return `${req.protocol}://${req.get("host")}`;
  }

  const port = Number(process.env.PORT) || 5000;

  return `http://localhost:${port}`;
};

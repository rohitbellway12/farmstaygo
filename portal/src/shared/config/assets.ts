import { backendBaseUrl } from "./app";

export const getAssetUrl = (
  storedPath?: string | null
): string => {
  if (!storedPath) {
    return "";
  }

  if (
    storedPath.startsWith("http://") ||
    storedPath.startsWith("https://") ||
    storedPath.startsWith("blob:") ||
    storedPath.startsWith("data:")
  ) {
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      storedPath.startsWith("http://")
    ) {
      return storedPath.replace(/^http:\/\//i, "https://");
    }
    return storedPath;
  }

  let base = backendBaseUrl;
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    base.startsWith("http://") &&
    !base.includes("localhost") &&
    !base.includes("127.0.0.1")
  ) {
    base = base.replace(/^http:\/\//i, "https://");
  }

  return `${base}${
    storedPath.startsWith("/") ? "" : "/"
  }${storedPath}`;
};

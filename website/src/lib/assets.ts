import { backendBaseUrl } from "./config";

export function getAssetUrl(
  storedPath?: string | null
): string {
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
      storedPath.startsWith("http://") &&
      !storedPath.includes("localhost") &&
      !storedPath.includes("127.0.0.1")
    ) {
      return storedPath.replace(/^http:\/\//i, "https://");
    }
    return storedPath;
  }

  let base = backendBaseUrl;
  if (
    base.startsWith("http://") &&
    !base.includes("localhost") &&
    !base.includes("127.0.0.1")
  ) {
    base = base.replace(/^http:\/\//i, "https://");
  }

  return `${base}${
    storedPath.startsWith("/") ? "" : "/"
  }${storedPath}`;
}

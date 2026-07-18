const backendBaseUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

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
    return storedPath;
  }

  return `${backendBaseUrl}${
    storedPath.startsWith("/") ? "" : "/"
  }${storedPath}`;
}

const trimTrailingSlashes = (value: string): string => {
  return value.replace(/\/+$/, "");
};

const apiPathPattern = /\/api\/?$/;

export const backendBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL?.replace(apiPathPattern, "") ||
    "http://localhost:5000"
);

export const apiBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_API_URL ||
    `${backendBaseUrl}/api`
);

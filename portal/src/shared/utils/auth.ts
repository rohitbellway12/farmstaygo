import type { AuthData, UserRole } from "../types/auth";

const AUTH_STORAGE_KEY = "farmstaygo_portal_auth";

export const saveAuth = (authData: AuthData): void => {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(authData)
  );
};

export const getAuth = (): AuthData | null => {
  try {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!savedAuth) {
      return null;
    }

    return JSON.parse(savedAuth) as AuthData;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const getToken = (): string | null => {
  return getAuth()?.token ?? null;
};

export const getUserRole = (): UserRole | null => {
  return getAuth()?.user.role ?? null;
};

export const clearAuth = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getDashboardByRole = (
  role: UserRole
): string => {
  if (role === "VENDOR") {
    return "/vendor/dashboard";
  }

  if (
    role === "ADMIN" ||
    role === "STAFF_ADMIN" ||
    role === "SUPPORT"
  ) {
    return "/admin/dashboard";
  }

  return "/admin/login";
};
import {
  Navigate,
  Outlet,
} from "react-router-dom";

import type { UserRole } from "../types/auth";

import {
  getAuth,
  getDashboardByRole,
} from "../utils/auth";

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  redirectTo: string;
}

export default function ProtectedRoute({
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  const auth = getAuth();

  if (!auth?.token) {
    return (
      <Navigate
        to={redirectTo}
        replace
      />
    );
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return (
      <Navigate
        to={getDashboardByRole(auth.user.role)}
        replace
      />
    );
  }

  return <Outlet />;
}
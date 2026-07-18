import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import AppRoutes from "./routes/AppRoutes";
import { AUTH_EXPIRED_EVENT } from "./shared/api/api";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      const loginPath =
        event instanceof CustomEvent &&
        typeof event.detail?.loginPath === "string"
          ? event.detail.loginPath
          : "/admin/login";

      navigate(loginPath, {
        replace: true,
      });
    };

    window.addEventListener(
      AUTH_EXPIRED_EVENT,
      handleAuthExpired
    );

    return () => {
      window.removeEventListener(
        AUTH_EXPIRED_EVENT,
        handleAuthExpired
      );
    };
  }, [navigate]);

  return <AppRoutes />;
}

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import axios from "axios";
import { useNavigate } from "react-router-dom";

import api from "../../shared/api/api";

import {
  getAuth,
  saveAuth,
} from "../../shared/utils/auth";

import type {
  AuthData,
  UserRole,
} from "../../shared/types/auth";

interface LoginResponse {
  success: boolean;
  message: string;
  data: AuthData;
}

const adminRoles: UserRole[] = [
  "ADMIN",
  "STAFF_ADMIN",
  "SUPPORT",
];

const TEST_EMAIL = "admin@farmstaygo.com";
const TEST_PASSWORD = "Admin@123";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [copiedField, setCopiedField] = useState<
    "email" | "password" | null
  >(null);

  useEffect(() => {
    const auth = getAuth();

    if (
      auth?.token &&
      adminRoles.includes(auth.user.role)
    ) {
      navigate("/admin/dashboard", {
        replace: true,
      });
    }
  }, [navigate]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>(
        "/auth/login",
        {
          email: email.trim(),
          password,
        }
      );

      const authData = response.data.data;

      if (
        !adminRoles.includes(authData.user.role)
      ) {
        setError(
          "This account is not authorized to access the admin panel."
        );

        return;
      }

      saveAuth(authData);

      navigate("/admin/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      if (
        axios.isAxiosError<{
          message?: string;
        }>(requestError)
      ) {
        setError(
          requestError.response?.data?.message ||
            "Unable to login. Please check your credentials."
        );
      } else {
        setError(
          "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const copyValue = async (
    value: string,
    field: "email" | "password"
  ) => {
    try {
      await navigator.clipboard.writeText(value);

      setCopiedField(field);

      window.setTimeout(() => {
        setCopiedField(null);
      }, 1500);
    } catch {
      setError("Unable to copy the value.");
    }
  };

  const fillTestCredentials = () => {
    setEmail(TEST_EMAIL);
    setPassword(TEST_PASSWORD);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      {/* Left Premium Branding Section */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#081d46] px-14 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-16">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(62,112,220,0.45),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(28,73,160,0.45),transparent_35%)]" />

        <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full border border-white/10 bg-white/5 blur-sm" />

        <div className="absolute right-10 top-12 h-72 w-72 rounded-full border border-white/10" />

        <div className="absolute -bottom-32 -left-28 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:52px_52px]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-xl backdrop-blur-md">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9 21v-7h6v7" />
            </svg>
          </div>

          <div>
            <strong className="block text-lg font-extrabold tracking-tight">
              FarmStayGo
            </strong>

            <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-blue-200/70">
              Administration
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-2xl py-12">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-100 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
            Platform Control Center
          </div>

          <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.05] tracking-[-0.045em] xl:text-7xl">
            Manage every part of your booking platform.
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-blue-100/65 xl:text-lg">
            Review properties, verify vendors, manage
            bookings, payments, commissions and platform
            operations from one secure dashboard.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V9l7-5 7 5v12" />
                  <path d="M9 21v-6h6v6" />
                </svg>
              </div>

              <strong className="block text-sm">
                Properties
              </strong>

              <span className="mt-1 block text-xs text-white/50">
                Review listings
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                </svg>
              </div>

              <strong className="block text-sm">
                Vendors
              </strong>

              <span className="mt-1 block text-xs text-white/50">
                Verify partners
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-md">
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 19V9" />
                  <path d="M10 19V5" />
                  <path d="M16 19v-7" />
                  <path d="M22 19V3" />
                </svg>
              </div>

              <strong className="block text-sm">
                Analytics
              </strong>

              <span className="mt-1 block text-xs text-white/50">
                Track growth
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/40">
          <span>© 2026 FarmStayGo</span>
          <span>Secure administration access</span>
        </div>
      </section>

      {/* Right Login Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:min-h-0 lg:px-12">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />

        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="relative z-10 w-full max-w-[460px]">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#10295f] text-white shadow-lg shadow-blue-950/20">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            </div>

            <div>
              <strong className="block text-lg font-extrabold text-slate-900">
                FarmStayGo
              </strong>

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-700">
                Administration
              </span>
            </div>
          </div>

          <div className="rounded-[28px] border border-white bg-white/90 p-6 shadow-[0_24px_80px_rgba(30,55,105,0.12)] backdrop-blur-xl sm:p-9">
            {/* Heading */}
            <div className="mb-8">
              <div className="mb-5 grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-[#10295f] to-[#3159aa] text-white shadow-lg shadow-blue-900/20">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2"
                  />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>

              <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-slate-900">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your credentials to access the
                FarmStayGo admin panel.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 17h.01" />
                </svg>

                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="admin-email"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                      />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>

                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Enter admin email"
                    autoComplete="email"
                    required
                    className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-bold text-slate-700"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-bold text-blue-700 transition hover:text-blue-900"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="2"
                      />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>

                  <input
                    id="admin-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 transition hover:text-blue-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#10295f] to-[#3159aa] px-5 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/20 focus:outline-none focus:ring-4 focus:ring-blue-700/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Admin Panel

                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Testing Credentials */}
            <div className="mt-7 rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-blue-800">
                    Testing Access
                  </span>

                  <p className="mt-1 text-xs text-blue-700/65">
                    Remove this section before production.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fillTestCredentials}
                  className="shrink-0 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-800"
                >
                  Fill Credentials
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Email
                    </span>

                    <code className="block truncate text-xs font-semibold text-slate-700">
                      {TEST_EMAIL}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        TEST_EMAIL,
                        "email"
                      )
                    }
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {copiedField === "email"
                      ? "Copied"
                      : "Copy"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </span>

                    <code className="block truncate text-xs font-semibold text-slate-700">
                      {TEST_PASSWORD}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        TEST_PASSWORD,
                        "password"
                      )
                    }
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {copiedField === "password"
                      ? "Copied"
                      : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Protected administration portal. Unauthorized
            access is restricted.
          </p>
        </div>
      </section>
    </main>
  );
}
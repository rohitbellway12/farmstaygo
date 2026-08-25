import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import axios from "axios";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

import api from "../shared/api/api";

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or expired reset link.");
    }
  }, [token]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid or expired reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response =
        await api.post<ResetPasswordResponse>(
          "/auth/reset-password",
          {
            token,
            newPassword: password,
          }
        );

      setSuccess(
        response.data.message ||
          "Password reset successfully! Redirecting to login..."
      );

      setTimeout(() => {
        navigate("/vendor/login");
      }, 2500);
    } catch (requestError) {
      if (
        axios.isAxiosError<{
          message?: string;
        }>(requestError)
      ) {
        setError(
          requestError.response?.data?.message ||
            "Unable to reset password. Please try again."
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

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* Left Branding Section */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#123d31] via-[#17634b] to-[#22946d] p-14 text-white lg:flex lg:items-center xl:p-20">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-20 left-16 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative z-10 max-w-xl">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-[#17634b]">
              F
            </span>
            <span className="text-xs font-bold tracking-[0.18em]">
              FARMSTAYGO PARTNER
            </span>
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-6xl">
            Reset your password securely.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg">
            Create a new password to regain access to your vendor dashboard.
          </p>
        </div>
      </section>

      {/* Reset Password Form Section */}
      <section className="flex min-h-screen items-center justify-center bg-[#f8faf9] px-5 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#17634b] font-black text-white">
                F
              </span>
              <div>
                <strong className="block text-lg text-slate-900">FarmStayGo</strong>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Vendor Partner
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_70px_rgba(15,70,52,0.08)] sm:p-9">
            <div className="mb-8">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-lg font-black text-[#17634b]">
                🔒
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Reset Password
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your new password below.
              </p>
            </div>

            {error && (
              <div
                className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
                role="alert"
              >
                {success}
              </div>
            )}

            {!token ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
                <p className="mb-4 font-semibold">Invalid or expired reset link.</p>
                <Link
                  to="/vendor/login"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#17634b] px-5 text-sm font-bold text-white transition hover:bg-[#104c39]"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#17634b] px-5 text-sm font-bold text-white transition hover:bg-[#104c39] focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Resetting..."
                    : "Reset Password"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Remember your password?{" "}
            <Link
              to="/vendor/login"
              className="font-bold text-emerald-700 hover:text-emerald-800"
            >
              Back to Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

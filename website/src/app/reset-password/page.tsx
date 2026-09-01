"use client";

import { useState, useEffect } from "react";

import { apiFetch, ApiRequestError } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      setSuccess("Your password has been reset successfully. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setError(requestError.message || "Something went wrong. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-ink-50 px-5 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-[0_4px_18px_rgba(22,52,35,0.06)] sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-50">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                Invalid Link
              </h1>
              <p className="mt-2 text-sm text-ink-500">
                {error}
              </p>
            </div>

            <Link
              href="/forgot-password"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-700/20"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-[0_4px_18px_rgba(22,52,35,0.06)] sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-50">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-700" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Reset Your Password
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              Enter your new password below.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700" role="alert">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-ink-700">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-ink-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-700/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Remember your password?{" "}
            <Link href="/login" className="font-bold text-brand-700 hover:text-brand-800">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import {
  useState,
  type FormEvent,
} from "react";

import { Link } from "react-router-dom";

import api from "../../shared/api/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post<{
        message: string;
      }>("/auth/forgot-password", { email });

      setSuccess(
        response.data.message ||
          "If an account exists with this email, you will receive a password reset link shortly."
      );
      setEmail("");
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to process request. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
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
            Forgot your password?
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg">
            No worries! Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>
      </section>

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
                🔑
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Reset Password
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your email address and we&apos;ll send you a link to reset your password.
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

            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-700">
                <p className="mb-4 font-semibold">{success}</p>
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
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#17634b] px-5 text-sm font-bold text-white transition hover:bg-[#104c39] focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Sending..."
                    : "Send Reset Link"}
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

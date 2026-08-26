"use client";

import { useEffect, useState } from "react";

import { apiFetch, ApiRequestError } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      firstName: string;
      lastName: string | null;
      email: string;
      mobile: string | null;
      role: string;
      status: string;
    };
    vendor: {
      id: number;
      businessName: string;
      kycStatus: string;
    } | null;
    token: string;
  };
}

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      if (response.data.user.role !== "USER") {
        setError("This account is not authorized for the customer portal.");
        setLoading(false);
        return;
      }

      localStorage.setItem("farmstaygo_customer_auth", JSON.stringify(response));

      window.dispatchEvent(new Event("auth-change"));

      const nextPath =
        new URLSearchParams(window.location.search).get("next") ||
        "/";

      router.push(nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setError(requestError.message || "Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)]">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-20 left-16 h-40 w-40 rounded-full bg-brand-300/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm w-fit">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-brand-700">F</span>
            <span className="text-xs font-bold tracking-[0.18em]">FARMSTAYGO</span>
          </div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Welcome back to FarmStayGo.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/75 xl:text-lg">
            Discover verified farmhouses, villas, and unique nature stays across India.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-ink-50 px-5 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-700 font-black text-white">F</span>
              <span className="text-lg font-bold text-ink-900">FarmStayGo</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-[0_4px_18px_rgba(22,52,35,0.06)] sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Sign in to your account</h2>
              <p className="mt-2 text-sm text-ink-500">Enter your credentials to continue booking stays.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-ink-700">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-ink-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button type="button" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-xl border border-ink-200 bg-white px-4 pr-16 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-500 hover:text-brand-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-700/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-bold text-brand-700 hover:text-brand-800">
                Create one
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-ink-400">
            By signing in, you agree to FarmStayGo&apos;s terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}

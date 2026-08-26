import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

import api from "../../shared/api/api";

import {
  getAuth,
  saveAuth,
} from "../../shared/utils/auth";

import type { AuthData } from "../../shared/types/auth";

interface LoginResponse {
  success: boolean;
  message: string;
  data: AuthData;
}

export default function VendorLoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title =
      "Vendor Login | FarmStayGo | Manage Your Property & Bookings";

    let metaDescription = document.querySelector(
      'meta[name="description"]'
    );
    if (!metaDescription) {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute(
      "content",
      "Log in to the FarmStayGo vendor portal to manage your property, availability, bookings, enquiries, pricing and listing details from one dashboard."
    );
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] =
    useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] =
    useState("");
  const [forgotLoading, setForgotLoading] =
    useState(false);

  useEffect(() => {
    const auth = getAuth();

    if (auth?.user.role === "VENDOR") {
      navigate("/vendor/dashboard", {
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

      if (authData.user.role !== "VENDOR") {
        setError(
          "This account is not authorized for the vendor panel."
        );

        return;
      }

      saveAuth(authData);

      navigate("/vendor/dashboard", {
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

  const handleForgotPassword = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setForgotMessage("");
    setForgotLoading(true);

    try {
      await api.post("/auth/forgot-password", {
        email: forgotEmail.trim(),
      });

      setForgotMessage(
        "Password reset link sent to your email. Please check your inbox."
      );
      setForgotEmail("");
    } catch (requestError) {
      if (
        axios.isAxiosError<{
          message?: string;
        }>(requestError)
      ) {
        setForgotMessage(
          requestError.response?.data?.message ||
            "Unable to send reset link. Please try again."
        );
      } else {
        setForgotMessage(
          "Something went wrong. Please try again."
        );
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      {/* Left Branding Section */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#123d31] via-[#17634b] to-[#22946d] p-14 text-white lg:flex lg:items-center xl:p-20">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-2xl" />

        <div className="absolute bottom-20 left-16 h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="absolute right-16 top-20 grid grid-cols-2 gap-4 opacity-40">
          <div className="h-24 w-24 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm" />

          <div className="mt-8 h-24 w-24 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm" />

          <div className="-mt-8 h-24 w-24 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm" />

          <div className="h-24 w-24 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm" />
        </div>

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
            Manage your properties and grow your
            bookings.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg">
            Control listings, pricing, availability,
            bookings, earnings and property operations
            from one simple dashboard.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <strong className="block text-xl">
                Easy
              </strong>

              <span className="mt-1 block text-xs text-white/65">
                Property listing
              </span>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <strong className="block text-xl">
                Smart
              </strong>

              <span className="mt-1 block text-xs text-white/65">
                Booking control
              </span>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <strong className="block text-xl">
                Clear
              </strong>

              <span className="mt-1 block text-xs text-white/65">
                Earnings tracking
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Login Form Section */}
      <section className="flex min-h-screen items-center justify-center bg-[#f8faf9] px-5 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#17634b] font-black text-white">
                F
              </span>

              <div>
                <strong className="block text-lg text-slate-900">
                  FarmStayGo
                </strong>

                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  Vendor Partner
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_70px_rgba(15,70,52,0.08)] sm:p-9">
            <div className="mb-8">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-lg font-black text-[#17634b]">
                V
              </span>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Vendor Login
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sign in to manage your properties and
                bookings.
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

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="vendor-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="vendor-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter vendor email"
                  autoComplete="email"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="vendor-password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setShowForgotPassword(true)
                    }
                    className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-800"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="vendor-password"
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
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-emerald-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#17634b] px-5 text-sm font-bold text-white transition hover:bg-[#104c39] focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Signing in..."
                  : "Sign In to Vendor Panel"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Partner access
              </span>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="text-center text-sm text-slate-500">
              Not registered as a vendor?{" "}
              <Link
                to="/vendor/register"
                className="font-bold text-emerald-700 hover:text-emerald-800"
              >
                Register here
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            By signing in, you agree to FarmStayGo
            partner terms and privacy policy.
          </p>
        </div>
      </section>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,70,52,0.08)] sm:p-9">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                Reset Password
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Enter your email and we'll send you a
                reset link.
              </p>
            </div>

            {forgotMessage && (
              <div
                className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                  forgotMessage.toLowerCase().includes("sent")
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {forgotMessage}
              </div>
            )}

            <form
              onSubmit={handleForgotPassword}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) =>
                    setForgotEmail(
                      event.target.value
                    )
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotMessage("");
                    setForgotEmail("");
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="h-11 rounded-xl bg-[#17634b] px-5 text-sm font-bold text-white transition hover:bg-[#104c39] focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {forgotLoading
                    ? "Sending..."
                    : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

import {
  useEffect,
  useState,
} from "react";

import type { FormEvent } from "react";

import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

import api from "../../shared/api/api";

interface RegisterResponse {
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
    };
    token: string;
  };
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export default function VendorRegisterPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("farmstaygo_portal_auth");

    if (auth) {
      try {
        const parsed = JSON.parse(auth) as { user?: { role?: string } };

        if (parsed?.user?.role === "VENDOR") {
          navigate("/vendor/dashboard", { replace: true });
        }
      } catch {
        localStorage.removeItem("farmstaygo_portal_auth");
      }
    }
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await api.post<RegisterResponse>(
        "/auth/register-vendor",
        {
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          businessName: businessName.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          password,
        }
      );

      setSuccess(true);
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        const errors = requestError.response?.data?.errors as Record<string, string> | undefined;

        if (errors) {
          const firstError = Object.values(errors)[0];
          setError(firstError || requestError.response?.data?.message || "Unable to register");
        } else {
          setError(requestError.response?.data?.message || "Unable to register. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="grid min-h-screen bg-white lg:grid-cols-2">
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
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-[#17634b]">F</span>
              <span className="text-xs font-bold tracking-[0.18em]">FARMSTAYGO PARTNER</span>
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-6xl">Application submitted successfully.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg">Our team will review your vendor application and get back to you shortly.</p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-[#f8faf9] px-5 py-10 sm:px-8 lg:min-h-0">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_70px_rgba(15,70,52,0.08)] sm:p-9">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-soft text-success">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" /></svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Account Created</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Your vendor account is created. Please log in and submit KYC details before adding properties.</p>
              <div className="mt-8">
                <Link to="/vendor/login" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#17634b] px-5 text-sm font-bold text-white transition hover:bg-[#104c39]">
                  Continue to Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
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
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-[#17634b]">F</span>
              <span className="text-xs font-bold tracking-[0.18em]">FARMSTAYGO PARTNER</span>
            </div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight xl:text-6xl">Join as a vendor partner.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/75 xl:text-lg">List your properties, manage bookings and grow your business with FarmStayGo.</p>
          </div>
        </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f8faf9] px-5 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#17634b] font-black text-white">F</span>
              <div>
                <strong className="block text-lg text-slate-900">FarmStayGo</strong>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Vendor Partner</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_70px_rgba(15,70,52,0.08)] sm:p-9">
            <div className="mb-8">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-lg font-black text-[#17634b]">V</span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Vendor Registration</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Create your vendor account. It requires admin approval before you can log in.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700" role="alert">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vendor-firstName" className="mb-2 block text-sm font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
                  <input id="vendor-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
                </div>
                <div>
                  <label htmlFor="vendor-lastName" className="mb-2 block text-sm font-semibold text-slate-700">Last Name</label>
                  <input id="vendor-lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
                </div>
              </div>

              <div>
                <label htmlFor="vendor-businessName" className="mb-2 block text-sm font-semibold text-slate-700">Business Name <span className="text-red-500">*</span></label>
                <input id="vendor-businessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Sunset Villas Pvt Ltd" required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vendor-email" className="mb-2 block text-sm font-semibold text-slate-700">Email <span className="text-red-500">*</span></label>
                  <input id="vendor-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@example.com" required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
                </div>
                <div>
                  <label htmlFor="vendor-mobile" className="mb-2 block text-sm font-semibold text-slate-700">Mobile <span className="text-red-500">*</span></label>
                  <input id="vendor-mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="9876543210" required className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
                </div>
              </div>

              <div>
                <label htmlFor="vendor-password" className="mb-2 block text-sm font-semibold text-slate-700">Password <span className="text-red-500">*</span></label>
                <input id="vendor-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required minLength={8} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-emerald-700" style={{ position: "relative", float: "right", marginTop: "-32px", marginRight: "8px", zIndex: 1 }}>{showPassword ? "Hide" : "Show"}</button>
              </div>

              <div>
                <label htmlFor="vendor-confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password <span className="text-red-500">*</span></label>
                <input id="vendor-confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required minLength={8} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10" />
              </div>

              <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#17634b] px-5 text-sm font-bold text-white transition hover:bg-[#104c39] focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Submitting..." : "Register as Vendor"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account? <Link to="/vendor/login" className="font-bold text-emerald-700 hover:text-emerald-800">Sign in</Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">By registering, you agree to FarmStayGo partner terms and privacy policy.</p>
        </div>
      </section>
    </main>
  );
}

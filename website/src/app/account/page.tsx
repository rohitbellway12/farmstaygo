"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { apiFetch, ApiRequestError } from "@/lib/api";

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  role: string;
  status: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: number;
    businessName: string | null;
    kycStatus: string;
    commissionRate: number | null;
  } | null;
}

interface ProfileResponse {
  success: boolean;
  message: string;
  data: UserProfile;
}

interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  mobile?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const authData = localStorage.getItem("farmstaygo_customer_auth");
    if (!authData) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await apiFetch<ProfileResponse>("/auth/me");
        if (cancelled) return;
        setProfile(response.data);
        setForm({
          firstName: response.data.firstName,
          lastName: response.data.lastName || "",
          mobile: response.data.mobile || "",
        });
      } catch {
        if (!cancelled) {
          setError("Unable to load profile. Please login again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters.";
    }

    if (form.mobile && !/^[+]?[\d\s-]{10,15}$/.test(form.mobile)) {
      newErrors.mobile = "Please enter a valid mobile number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validate()) return;

    setSaving(true);

    try {
      const body: UpdateProfileBody = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
      };

      const response = await apiFetch<ProfileResponse>("/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      setProfile(response.data);
      setSuccess("Profile updated successfully.");

      const authData = localStorage.getItem("farmstaygo_customer_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed?.data?.user) {
            parsed.data.user = {
              ...parsed.data.user,
              firstName: response.data.firstName,
              lastName: response.data.lastName,
            };
            localStorage.setItem("farmstaygo_customer_auth", JSON.stringify(parsed));
            window.dispatchEvent(new Event("auth-change"));
          }
        } catch {
          // Ignore
        }
      }
    } catch {
      setError("Unable to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="section-spacing">
        <div className="site-container">
          <div className="mx-auto max-w-2xl">
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-2xl bg-ink-100"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="section-spacing">
        <div className="site-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-ink-500">{error || "Profile not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing">
      <div className="site-container">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-ink-100 bg-ink-50 p-8 shadow-sm sm:p-10">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-2xl font-extrabold text-brand-700">
                {profile.firstName.charAt(0).toUpperCase()}
              </span>
              <div>
                <h1 className="text-2xl font-extrabold text-ink-900">
                  {profile.firstName} {profile.lastName}
                </h1>
                <p className="text-sm text-ink-500">
                  {profile.email}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-bold text-success">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-xs font-extrabold text-ink-600">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className={`mt-1 h-12 w-full rounded-xl border bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 ${
                      errors.firstName ? "border-danger" : "border-ink-200"
                    }`}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-danger">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-xs font-extrabold text-ink-600">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="mt-1 h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-extrabold text-ink-600">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 h-12 w-full rounded-xl border border-ink-200 bg-ink-50 px-4 text-sm text-ink-500"
                />
              </div>

              <div>
                <label htmlFor="mobile" className="block text-xs font-extrabold text-ink-600">
                  Mobile Number
                </label>
                <input
                  id="mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className={`mt-1 h-12 w-full rounded-xl border bg-white px-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 ${
                    errors.mobile ? "border-danger" : "border-ink-200"
                  }`}
                  placeholder="+91 9876543210"
                />
                {errors.mobile && (
                  <p className="mt-1 text-xs text-danger">{errors.mobile}</p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold text-ink-600">
                    Account Status
                  </label>
                  <span className={`mt-1 inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${
                    profile.status === "ACTIVE"
                      ? "bg-success-soft text-success"
                      : profile.status === "INACTIVE"
                        ? "bg-warning-soft text-warning"
                        : "bg-danger-soft text-danger"
                  }`}>
                    {profile.status}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-ink-600">
                    Member Since
                  </label>
                  <p className="mt-1 text-sm text-ink-700">
                    {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-12 w-full rounded-xl bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-700/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

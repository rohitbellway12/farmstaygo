import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import api from "../../shared/api/api";
import {
  getAuth,
  saveAuth,
} from "../../shared/utils/auth";

interface ProfileUser {
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
  vendor: {
    id: number;
    businessName: string;
    kycStatus:
      | "NOT_SUBMITTED"
      | "PENDING"
      | "APPROVED"
      | "REJECTED";
    commissionRate: number | null;
    totalEarnings: number | null;
    totalCommission: number | null;
  };
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[] | string>;
}

const statusConfig: Record<
  string,
  {
    label: string;
    className: string;
    description: string;
  }
> = {
  NOT_SUBMITTED: {
    label: "Not Submitted",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
    description:
      "Submit KYC for payout eligibility.",
  },
  PENDING: {
    label: "Pending Admin Approval",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
    description:
      "Your KYC has been submitted and is waiting for admin review.",
  },
  APPROVED: {
    label: "Approved",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    description:
      "Your KYC is approved.",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
    description:
      "Please correct the details and submit KYC again.",
  },
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): {
  message: string;
  errors: Record<string, string>;
} => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const fieldErrors: Record<string, string> = {};
    const errors = error.response?.data?.errors;

    if (errors) {
      Object.entries(errors).forEach(([key, value]) => {
        fieldErrors[key] = Array.isArray(value)
          ? value[0] || fallback
          : value;
      });
    }

    return {
      message:
        error.response?.data?.message ||
        error.message ||
        fallback,
      errors: fieldErrors,
    };
  }

  return {
    message: fallback,
    errors: {},
  };
};

function FieldError({
  message,
}: {
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1.5 text-xs font-bold text-red-600">
      {message}
    </p>
  );
}

function formatMoney(
  value: number | null,
  currency = "INR"
): string {
  if (value === null || value === undefined) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function VendorSettingsPage() {
  const [profile, setProfile] =
    useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingProfile, setSubmittingProfile] =
    useState(false);
  const [submittingPassword, setSubmittingPassword] =
    useState(false);
  const [pageError, setPageError] = useState("");
  const [profileMessage, setProfileMessage] =
    useState("");
  const [passwordMessage, setPasswordMessage] =
    useState("");
  const [profileErrors, setProfileErrors] = useState<
    Record<string, string>
  >({});
  const [passwordErrors, setPasswordErrors] = useState<
    Record<string, string>
  >({});

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    businessName: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<{
        success: boolean;
        data: ProfileUser;
      }>("/auth/me");

      const data = response.data.data;
      setProfile(data);
      setProfileForm({
        firstName: data.firstName,
        lastName: data.lastName || "",
        mobile: data.mobile || "",
        businessName: data.vendor?.businessName || "",
      });
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          "Unable to load profile."
        ).message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateProfileField = (
    field: keyof typeof profileForm,
    value: string
  ) => {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
    setProfileErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setProfileMessage("");
  };

  const updatePasswordField = (
    field: keyof typeof passwordForm,
    value: string
  ) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
    setPasswordErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setPasswordMessage("");
  };

  const handleProfileSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setSubmittingProfile(true);
    setPageError("");
    setProfileErrors({});
    setProfileMessage("");

    try {
      const response = await api.patch<{
        success: boolean;
        message: string;
        data: ProfileUser;
      }>("/auth/profile", {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim() || undefined,
        mobile: profileForm.mobile.trim() || undefined,
        businessName: profileForm.businessName.trim() || undefined,
      });

      const updatedUser = response.data.data;
      setProfile(updatedUser);
      setProfileForm({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName || "",
        mobile: updatedUser.mobile || "",
        businessName: updatedUser.vendor?.businessName || "",
      });

      const auth = getAuth();
      if (auth) {
        saveAuth({
          ...auth,
          user: {
            ...auth.user,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            mobile: updatedUser.mobile,
          },
          vendor: updatedUser.vendor
            ? {
                id: auth!.vendor!.id,
                businessName:
                  updatedUser.vendor.businessName,
                kycStatus:
                  auth!.vendor!.kycStatus,
              }
            : null,
        });
      }

      setProfileMessage(response.data.message);
    } catch (error) {
      const details = getErrorMessage(
        error,
        "Unable to update profile."
      );
      setPageError(details.message);
      setProfileErrors(details.errors);
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setSubmittingPassword(true);
    setPasswordErrors({});
    setPasswordMessage("");
    setPageError("");

    const errors: Record<string, string> = {};
    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    if (!passwordForm.newPassword) {
      errors.newPassword =
        "New password is required";
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword =
        "Password must be at least 8 characters";
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword =
        "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      setSubmittingPassword(false);
      return;
    }

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
      }>("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordMessage(response.data.message);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      const details = getErrorMessage(
        error,
        "Unable to change password."
      );
      setPageError(details.message);
      setPasswordErrors(details.errors);
    } finally {
      setSubmittingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <section className="rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard">
          <div className="h-8 w-48 animate-pulse rounded bg-surface-soft" />
          <div className="mt-4 h-64 animate-pulse rounded-dashboard-card bg-surface-soft" />
        </section>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-dashboard-card border border-border bg-surface p-8 text-center shadow-dashboard-card">
        <h2 className="text-lg font-extrabold text-text-main">
          No data available
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Unable to load profile data.
        </p>
      </div>
    );
  }

  const kycStatus =
    statusConfig[profile.vendor?.kycStatus || "NOT_SUBMITTED"] ||
    statusConfig.NOT_SUBMITTED;

  const commissionRate =
    profile.vendor?.commissionRate !== null &&
    profile.vendor?.commissionRate !== undefined
      ? Number(profile.vendor.commissionRate)
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Account
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-text-main">
              Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Manage your vendor account profile, security,
              and preferences.
            </p>
          </div>

          <span
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-extrabold ${kycStatus.className}`}
          >
            {kycStatus.label}
          </span>
        </div>

        <p className="mt-4 rounded-control border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-text-secondary">
          {kycStatus.description}
        </p>

        {profile.vendor?.kycStatus === "REJECTED" && (
          <Link
            to="/vendor/kyc-bank"
            className="mt-4 inline-flex rounded-control border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            Review & Resubmit KYC
          </Link>
        )}
      </section>

      {pageError && (
        <section className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {pageError}
        </section>
      )}

      {profileMessage && (
        <section className="rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {profileMessage}
        </section>
      )}

      {passwordMessage && (
        <section className="rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {passwordMessage}
        </section>
      )}

      <form
        onSubmit={handleProfileSubmit}
        className="space-y-5"
      >
        <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
          <h2 className="text-lg font-extrabold text-text-main">
            Profile Information
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Update your personal and business details.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                First Name *
              </span>
              <input
                value={profileForm.firstName}
                onChange={(event) =>
                  updateProfileField(
                    "firstName",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <FieldError
                message={profileErrors.firstName}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Last Name
              </span>
              <input
                value={profileForm.lastName}
                onChange={(event) =>
                  updateProfileField(
                    "lastName",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <FieldError
                message={profileErrors.lastName}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Business Name *
              </span>
              <input
                value={profileForm.businessName}
                onChange={(event) =>
                  updateProfileField(
                    "businessName",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <FieldError
                message={profileErrors.businessName}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Mobile Number
              </span>
              <input
                value={profileForm.mobile}
                onChange={(event) =>
                  updateProfileField(
                    "mobile",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <FieldError
                message={profileErrors.mobile}
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <button
              type="submit"
              disabled={submittingProfile}
              className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingProfile
                ? "Saving..."
                : "Save Profile"}
            </button>
          </div>
        </section>
      </form>

      <form
        onSubmit={handlePasswordSubmit}
        className="space-y-5"
      >
        <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
          <h2 className="text-lg font-extrabold text-text-main">
            Change Password
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Update your password to keep your account
            secure.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Current Password *
              </span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  updatePasswordField(
                    "currentPassword",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <FieldError
                message={passwordErrors.currentPassword}
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                New Password *
              </span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  updatePasswordField(
                    "newPassword",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <FieldError
                message={passwordErrors.newPassword}
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Confirm New Password *
              </span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  updatePasswordField(
                    "confirmPassword",
                    event.target.value
                  )
                }
                className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <FieldError
                message={passwordErrors.confirmPassword}
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <button
              type="submit"
              disabled={submittingPassword}
              className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingPassword
                ? "Updating..."
                : "Update Password"}
            </button>
          </div>
        </section>
      </form>

      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <h2 className="text-lg font-extrabold text-text-main">
          Account Information
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Details about your account and verification
          status.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Email
            </span>
            <p className="mt-1 text-sm font-bold text-text-main">
              {profile.email}
            </p>
            <span
              className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${
                profile.emailVerified
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {profile.emailVerified
                ? "Verified"
                : "Unverified"}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Mobile
            </span>
            <p className="mt-1 text-sm font-bold text-text-main">
              {profile.mobile || "Not provided"}
            </p>
            {profile.mobile && (
              <span
                className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${
                  profile.mobileVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {profile.mobileVerified
                  ? "Verified"
                  : "Unverified"}
              </span>
            )}
          </div>

          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Role
            </span>
            <p className="mt-1 text-sm font-bold text-text-main">
              {profile.role}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Account Status
            </span>
            <p className="mt-1 text-sm font-bold text-text-main">
              {profile.status}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Member Since
            </span>
            <p className="mt-1 text-sm font-bold text-text-main">
              {new Date(
                profile.createdAt
              ).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              KYC Status
            </span>
            <p className="mt-1">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${kycStatus.className}`}
              >
                {kycStatus.label}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <h2 className="text-lg font-extrabold text-text-main">
          Financial Summary
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Your earnings, commissions, and payout
          details.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Total Earnings
            </span>
            <p className="mt-1 text-lg font-extrabold text-success">
              {formatMoney(
                profile.vendor?.totalEarnings ?? null
              )}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Total Commission Paid
            </span>
            <p className="mt-1 text-lg font-extrabold text-danger">
              {formatMoney(
                profile.vendor?.totalCommission ?? null
              )}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Commission Rate
            </span>
            <p className="mt-1 text-lg font-extrabold text-text-main">
              {commissionRate !== null
                ? `${commissionRate}%`
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Link
            to="/vendor/earnings"
            className="inline-flex h-10 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800"
          >
            View Detailed Earnings
          </Link>
        </div>
      </section>

      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <h2 className="text-lg font-extrabold text-text-main">
          Bank Account Details
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Manage your bank account for payouts and
          bank transfer payments.
        </p>

        <BankDetailsForm />
      </section>
    </div>
  );
}

function BankDetailsForm() {
  const [bankDetails, setBankDetails] = useState<{
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfscCode: string;
  }>({
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfscCode: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});

  const loadBankDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get<{
        success: boolean;
        data: {
          bankAccountName: string | null;
          bankAccountNumber: string | null;
          bankIfscCode: string | null;
        };
      }>("/vendor/bank-details");

      const data = response.data.data;
      setBankDetails({
        bankAccountName: data.bankAccountName || "",
        bankAccountNumber: data.bankAccountNumber || "",
        bankIfscCode: data.bankIfscCode || "",
      });
    } catch {
      setError("Unable to load bank details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBankDetails();
  }, [loadBankDetails]);

  const updateField = (
    field: keyof typeof bankDetails,
    value: string
  ) => {
    setBankDetails((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: "",
    }));
    setMessage("");
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setFieldErrors({});

    try {
      const response = await api.put<{
        success: boolean;
        message: string;
      }>("/vendor/bank-details", {
        bankAccountName: bankDetails.bankAccountName.trim(),
        bankAccountNumber: bankDetails.bankAccountNumber.trim(),
        bankIfscCode: bankDetails.bankIfscCode.trim().toUpperCase(),
      });

      setMessage(response.data.message);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const apiErrors =
          err.response?.data?.errors;
        if (apiErrors) {
          setFieldErrors(apiErrors);
        }
        setError(
          err.response?.data?.message ||
            "Unable to update bank details."
        );
      } else {
        setError("Unable to update bank details.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-5 space-y-3">
        <div className="h-11 animate-pulse rounded bg-surface-soft" />
        <div className="h-11 animate-pulse rounded bg-surface-soft" />
        <div className="h-11 animate-pulse rounded bg-surface-soft" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
          Account Holder Name *
          <input
            type="text"
            value={bankDetails.bankAccountName}
            onChange={(e) =>
              updateField(
                "bankAccountName",
                e.target.value
              )
            }
            placeholder="Name as per bank account"
            className="h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
          />
          {fieldErrors.bankAccountName && (
            <span className="text-xs font-bold text-red-600">
              {fieldErrors.bankAccountName}
            </span>
          )}
        </label>

        <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
          Bank Account Number *
          <input
            type="text"
            value={bankDetails.bankAccountNumber}
            onChange={(e) =>
              updateField(
                "bankAccountNumber",
                e.target.value
              )
            }
            placeholder="Enter bank account number"
            className="h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
          />
          {fieldErrors.bankAccountNumber && (
            <span className="text-xs font-bold text-red-600">
              {fieldErrors.bankAccountNumber}
            </span>
          )}
        </label>

        <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary md:col-span-2">
          IFSC Code *
          <input
            type="text"
            value={bankDetails.bankIfscCode}
            onChange={(e) =>
              updateField(
                "bankIfscCode",
                e.target.value.toUpperCase()
              )
            }
            placeholder="e.g. SBIN0001234"
            maxLength={11}
            className="h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
          />
          {fieldErrors.bankIfscCode && (
            <span className="text-xs font-bold text-red-600">
              {fieldErrors.bankIfscCode}
            </span>
          )}
        </label>
      </div>

      {message && (
        <div className="rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Bank Details"}
        </button>
      </div>
    </form>
  );
}

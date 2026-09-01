import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { FormEvent } from "react";

import api from "../../shared/api/api";
import {
  getAuth,
  saveAuth,
} from "../../shared/utils/auth";

type KycStatus =
  | "NOT_SUBMITTED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

interface VendorKyc {
  id: number;
  businessName: string;
  kycStatus: KycStatus;
  panNumber: string | null;
  aadhaarNumber: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  gstNumber: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycRejectionReason: string | null;
}

interface VendorKycResponse {
  success: boolean;
  message: string;
  data: VendorKyc;
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[] | string>;
}

interface KycFormState {
  panNumber: string;
  aadhaarNumber: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  gstNumber: string;
}

const emptyForm: KycFormState = {
  panNumber: "",
  aadhaarNumber: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  gstNumber: "",
};

const statusConfig: Record<
  KycStatus,
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

export default function KycBankPage() {
  const [vendorKyc, setVendorKyc] =
    useState<VendorKyc | null>(null);
  const [form, setForm] =
    useState<KycFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [pageError, setPageError] =
    useState("");
  const [formErrors, setFormErrors] =
    useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadKyc = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response =
        await api.get<VendorKycResponse>(
          "/vendor/kyc"
        );

      const data = response.data.data;
      const auth = getAuth();

      if (auth?.vendor) {
        saveAuth({
          ...auth,
          vendor: {
            ...auth.vendor,
            kycStatus: data.kycStatus,
          },
        });
      }

      setVendorKyc(data);
      setForm({
        panNumber: data.panNumber || "",
        aadhaarNumber: data.aadhaarNumber || "",
        addressLine: data.addressLine || "",
        city: data.city || "",
        state: data.state || "",
        postalCode: data.postalCode || "",
        gstNumber: data.gstNumber || "",
      });
    } catch (error) {
      setPageError(
        getErrorMessage(
          error,
          "Unable to load KYC details."
        ).message
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKyc();
  }, [loadKyc]);

  const updateForm = (
    field: keyof KycFormState,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFormErrors((current) => ({
      ...current,
      [field]: "",
    }));

    setSuccessMessage("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSubmitting(true);
    setPageError("");
    setFormErrors({});
    setSuccessMessage("");

    try {
      const response =
        await api.put<VendorKycResponse>(
          "/vendor/kyc",
          {
            panNumber: form.panNumber
              .trim()
              .toUpperCase(),
            aadhaarNumber: form.aadhaarNumber
              .trim(),
            addressLine: form.addressLine
              .trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            postalCode: form.postalCode.trim(),
            gstNumber:
              form.gstNumber.trim().toUpperCase() ||
              undefined,
          }
        );

      const updatedVendor = response.data.data;
      const auth = getAuth();

      if (auth?.vendor) {
        saveAuth({
          ...auth,
          vendor: {
            ...auth.vendor,
            kycStatus: updatedVendor.kycStatus,
          },
        });
      }

      setVendorKyc(updatedVendor);
      setSuccessMessage(response.data.message);
    } catch (error) {
      const details = getErrorMessage(
        error,
        "Unable to submit KYC details."
      );

      setPageError(details.message);
      setFormErrors(details.errors);
    } finally {
      setSubmitting(false);
    }
  };

  const status =
    statusConfig[
      vendorKyc?.kycStatus || "NOT_SUBMITTED"
    ];

  const formLocked =
    vendorKyc?.kycStatus === "APPROVED" ||
    vendorKyc?.kycStatus === "PENDING";

  return (
    <div className="space-y-5">
      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Verification
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-text-main">
              KYC & Bank Details
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Submit identity, address and payout
              details.
            </p>
          </div>

          <span
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-extrabold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <p className="mt-4 rounded-control border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-text-secondary">
          {status.description}
        </p>

        {vendorKyc?.kycStatus === "REJECTED" &&
          vendorKyc.kycRejectionReason && (
            <div className="mt-4 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Rejection reason:{" "}
           {vendorKyc.kycRejectionReason}
             </div>
           )}
         </section>

      {pageError && (
        <section className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {pageError}
        </section>
      )}

      {successMessage && (
        <section className="rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {successMessage}
        </section>
      )}

      {loading ? (
        <section className="rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard">
          <div className="h-80 animate-pulse rounded-dashboard-card bg-surface-soft" />
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Identity Details
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  PAN Number *
                </span>
                <input
                  value={form.panNumber}
                  disabled={formLocked}
                  onChange={(event) =>
                    updateForm(
                      "panNumber",
                      event.target.value
                    )
                  }
                  placeholder="ABCDE1234F"
                  className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold uppercase outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                />
                <FieldError
                  message={formErrors.panNumber}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Aadhaar Number *
                </span>
                <input
                  value={form.aadhaarNumber}
                  disabled={formLocked}
                  maxLength={12}
                  onChange={(event) =>
                    updateForm(
                      "aadhaarNumber",
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="12 digit Aadhaar"
                  className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                />
                <FieldError
                  message={
                    formErrors.aadhaarNumber
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Address Details
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Address *
                </span>
                <input
                  value={form.addressLine}
                  disabled={formLocked}
                  onChange={(event) =>
                    updateForm(
                      "addressLine",
                      event.target.value
                    )
                  }
                  placeholder="House number, street, locality"
                  className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                />
                <FieldError
                  message={formErrors.addressLine}
                />
              </label>

              {(["city", "state", "postalCode"] as const).map(
                (field) => (
                  <label key={field}>
                    <span className="mb-2 block text-sm font-bold capitalize text-text-secondary">
                      {field === "postalCode"
                        ? "Postal Code"
                        : field}{" "}
                      *
                    </span>
                    <input
                      value={form[field]}
                      disabled={formLocked}
                      onChange={(event) =>
                        updateForm(
                          field,
                          event.target.value
                        )
                      }
                      className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                    />
                    <FieldError
                      message={formErrors[field]}
                    />
                  </label>
                )
              )}
            </div>
          </section>

          {!formLocked && (
            <section className="sticky bottom-4 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <p className="text-sm font-semibold text-text-muted">
                   After submission, your details will be reviewed.
                 </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit KYC"}
                </button>
              </div>
            </section>
          )}
        </form>
      )}

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

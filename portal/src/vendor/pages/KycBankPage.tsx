import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

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
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
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
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  gstNumber: string;
}

const emptyForm: KycFormState = {
  panNumber: "",
  aadhaarNumber: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfscCode: "",
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
        bankAccountName:
          data.bankAccountName || "",
        bankAccountNumber:
          data.bankAccountNumber || "",
        bankIfscCode: data.bankIfscCode || "",
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
            ...form,
            panNumber: form.panNumber
              .trim()
              .toUpperCase(),
            bankIfscCode: form.bankIfscCode
              .trim()
              .toUpperCase(),
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

          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Bank & Tax Details
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Account Holder Name *
                </span>
                <input
                  value={form.bankAccountName}
                  disabled={formLocked}
                  onChange={(event) =>
                    updateForm(
                      "bankAccountName",
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                />
                <FieldError
                  message={
                    formErrors.bankAccountName
                  }
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Bank Account Number *
                </span>
                <input
                  value={form.bankAccountNumber}
                  disabled={formLocked}
                  onChange={(event) =>
                    updateForm(
                      "bankAccountNumber",
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                />
                <FieldError
                  message={
                    formErrors.bankAccountNumber
                  }
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  IFSC Code *
                </span>
                <input
                  value={form.bankIfscCode}
                  disabled={formLocked}
                  onChange={(event) =>
                    updateForm(
                      "bankIfscCode",
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="HDFC0123456"
                  className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold uppercase outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                />
                <FieldError
                  message={
                    formErrors.bankIfscCode
                  }
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  GST Number
                </span>
                <input
                  value={form.gstNumber}
                  disabled={formLocked}
                  onChange={(event) =>
                    updateForm(
                      "gstNumber",
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Optional"
                  className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-semibold uppercase outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:bg-surface-muted"
                />
              </label>
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
    </div>
  );
}

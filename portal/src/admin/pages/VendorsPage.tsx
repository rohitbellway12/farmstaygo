import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../shared/api/api";

type KycStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
type KycStatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED" | "NOT_SUBMITTED";

interface VendorUser {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  status: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  createdAt: string;
}

interface AdminVendor {
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
  commissionRate: string | number | null;
  createdAt: string;
  updatedAt: string;
  user: VendorUser;
}

interface VendorListResponse {
  success: boolean;
  message: string;
  data: AdminVendor[];
  total: number;
}

interface CreateVendorResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    businessName: string;
    kycStatus: KycStatus;
    commissionRate: string | number | null;
    user: {
      id: number;
      firstName: string;
      lastName: string | null;
      email: string;
      mobile: string | null;
      role: string;
      status: string;
    };
  };
}

interface VendorActionResponse {
  success: boolean;
  message: string;
  data: AdminVendor;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

const statusConfig: Record<
  KycStatusFilter,
  { label: string; badgeClass: string; dotClass: string }
> = {
  ALL: { label: "All Vendors", badgeClass: "border-border bg-surface-muted text-text-secondary", dotClass: "bg-text-soft" },
  PENDING: { label: "Pending Approval", badgeClass: "border-warning/20 bg-warning-soft text-warning", dotClass: "bg-warning" },
  APPROVED: { label: "Approved", badgeClass: "border-success/20 bg-success-soft text-success", dotClass: "bg-success" },
  REJECTED: { label: "Rejected", badgeClass: "border-danger/20 bg-danger-soft text-danger", dotClass: "bg-danger" },
  NOT_SUBMITTED: { label: "Not Submitted", badgeClass: "border-border bg-surface-muted text-text-secondary", dotClass: "bg-text-soft" },
};

const formatDate = (value?: string | null): string => {
  if (!value) return "Not available";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(parsedDate);
};

const getVendorName = (vendor: AdminVendor): string => {
  const fullName = [vendor.user.firstName, vendor.user.lastName].filter(Boolean).join(" ");
  return vendor.businessName || fullName || "Vendor";
};

const maskValue = (
  value?: string | null
): string => {
  if (!value) return "Not submitted";
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  return fallbackMessage;
};

function VendorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 6 12 12" /><path d="M18 6 6 18" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.14.93.36 1.84.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.97.34 1.88.56 2.81.7a2 2 0 0 1 1.72 2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function StatusBadge({ status }: { status: KycStatusFilter }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.badgeClass}`}>
      <span className={`h-2 w-2 rounded-full ${status === "PENDING" ? "bg-warning" : status === "APPROVED" ? "bg-success" : status === "REJECTED" ? "bg-danger" : "bg-text-soft"}`} />
      {config.label}
    </span>
  );
}

function StatisticCard({ title, value, description, iconClass }: { title: string; value: number; description: string; iconClass: string }) {
  return (
    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-text-muted">{title}</span>
          <strong className="mt-2 block text-3xl font-extrabold leading-none text-text-main">{value}</strong>
          <span className="mt-2 block text-xs text-text-muted">{description}</span>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${iconClass}`}><VendorIcon /></span>
      </div>
    </section>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((item) => (
        <tr key={item} className="border-b border-border last:border-b-0">
          <td className="px-5 py-4"><div className="space-y-2"><div className="h-4 w-36 animate-pulse rounded bg-surface-muted" /><div className="h-3 w-48 animate-pulse rounded bg-surface-muted" /></div></td>
          <td className="px-5 py-4"><div className="h-4 w-44 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-4 w-16 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-7 w-24 animate-pulse rounded-full bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-9 w-28 animate-pulse rounded-lg bg-surface-muted" /></td>
        </tr>
      ))}
    </>
  );
}

function CreateVendorModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({ firstName: "", lastName: "", businessName: "", email: "", mobile: "", password: "", commissionRate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", businessName: "", email: "", mobile: "", password: "", commissionRate: "" });
    setError("");
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        businessName: formData.businessName.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        password: formData.password,
      };
      if (formData.lastName.trim()) payload.lastName = formData.lastName.trim();
      if (formData.commissionRate.trim()) payload.commissionRate = formData.commissionRate.trim();
      await api.post<CreateVendorResponse>("/admin/vendors", payload);
      resetForm();
      onClose();
      onCreated();
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setError(requestError.response?.data?.message || "Unable to create vendor");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface shadow-dashboard-dropdown">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Add New Vendor</h2>
            <p className="mt-1 text-sm text-text-muted">Create a vendor account directly. It will be auto-approved.</p>
          </div>
          <button type="button" onClick={handleClose} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"><CloseIcon /></button>
        </div>
        {error && <div className="m-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vendor-firstName" className="mb-2 block text-sm font-semibold text-text-secondary">First Name <span className="text-danger">*</span></label>
              <input id="vendor-firstName" type="text" value={formData.firstName} onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))} placeholder="John" required className="h-11 w-full rounded-control border border-border bg-white px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
            <div>
              <label htmlFor="vendor-lastName" className="mb-2 block text-sm font-semibold text-text-secondary">Last Name</label>
              <input id="vendor-lastName" type="text" value={formData.lastName} onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))} placeholder="Doe" className="h-11 w-full rounded-control border border-border bg-white px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
          </div>
          <div>
            <label htmlFor="vendor-businessName" className="mb-2 block text-sm font-semibold text-text-secondary">Business Name <span className="text-danger">*</span></label>
            <input id="vendor-businessName" type="text" value={formData.businessName} onChange={(e) => setFormData((prev) => ({ ...prev, businessName: e.target.value }))} placeholder="Sunset Villas Pvt Ltd" required className="h-11 w-full rounded-control border border-border bg-white px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vendor-email" className="mb-2 block text-sm font-semibold text-text-secondary">Email <span className="text-danger">*</span></label>
              <input id="vendor-email" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} placeholder="vendor@example.com" required className="h-11 w-full rounded-control border border-border bg-white px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
            <div>
              <label htmlFor="vendor-mobile" className="mb-2 block text-sm font-semibold text-text-secondary">Mobile <span className="text-danger">*</span></label>
              <input id="vendor-mobile" type="tel" value={formData.mobile} onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))} placeholder="9876543210" required className="h-11 w-full rounded-control border border-border bg-white px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
          </div>
          <div>
            <label htmlFor="vendor-password" className="mb-2 block text-sm font-semibold text-text-secondary">Password <span className="text-danger">*</span></label>
            <input id="vendor-password" type="password" value={formData.password} onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))} placeholder="Min 8 characters" required minLength={8} className="h-11 w-full rounded-control border border-border bg-white px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
          </div>
          <div>
            <label htmlFor="vendor-commissionRate" className="mb-2 block text-sm font-semibold text-text-secondary">Commission Rate (%)</label>
            <input id="vendor-commissionRate" type="number" min="0" max="100" step="0.01" value={formData.commissionRate} onChange={(e) => setFormData((prev) => ({ ...prev, commissionRate: e.target.value }))} placeholder="e.g. 10.5" className="h-11 w-full rounded-control border border-border bg-white px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-muted">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-600/20 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Creating..." : "Create Vendor"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RejectVendorModal({ open, onClose, vendor, onRejected }: { open: boolean; onClose: () => void; vendor: AdminVendor | null; onRejected: () => void }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setReason(""); setError(""); } }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!vendor) return;
    setError("");
    setSubmitting(true);
    try {
      await api.patch<VendorActionResponse>(`/admin/vendors/${vendor.id}/reject`, { reason });
      setReason("");
      onClose();
      onRejected();
    } catch (requestError) {
      if (axios.isAxiosError<ApiErrorResponse>(requestError)) {
        setError(requestError.response?.data?.message || "Unable to reject vendor");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !vendor) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface shadow-dashboard-dropdown">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Reject Vendor</h2>
            <p className="mt-1 text-sm text-text-muted">{getVendorName(vendor)}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"><CloseIcon /></button>
        </div>
        {error && <div className="m-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="reject-reason" className="mb-2 block text-sm font-semibold text-text-secondary">Rejection Reason <span className="text-danger">*</span></label>
            <textarea id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason for rejection..." rows={4} required minLength={5} className="w-full rounded-control border border-border bg-white px-4 py-3 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-muted">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-danger px-5 text-sm font-bold text-white transition hover:bg-danger/90 focus:outline-none focus:ring-4 focus:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Rejecting..." : "Reject Vendor"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-control border border-border bg-surface-soft p-3">
      <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">{label}</span>
      <strong className="mt-1 block break-words text-sm text-text-main">{value || "Not submitted"}</strong>
    </div>
  );
}

function ViewKycModal({ open, onClose, vendor }: { open: boolean; onClose: () => void; vendor: AdminVendor | null }) {
  if (!open || !vendor) return null;

  const address = [
    vendor.addressLine,
    vendor.city,
    vendor.state,
    vendor.postalCode,
  ].filter(Boolean).join(", ");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-surface shadow-dashboard-dropdown">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Vendor KYC Documents</h2>
            <p className="mt-1 text-sm text-text-muted">{getVendorName(vendor)} - {vendor.businessName}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"><CloseIcon /></button>
        </div>

        <div className="max-h-[calc(90vh-82px)] overflow-y-auto p-5">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <StatusBadge status={vendor.kycStatus as KycStatusFilter} />
            <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${vendor.user.status === "ACTIVE" ? "bg-success-soft text-success" : vendor.user.status === "INACTIVE" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"}`}>
              Account: {vendor.user.status}
            </span>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-extrabold text-text-main">Contact Details</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailItem label="Contact Person" value={[vendor.user.firstName, vendor.user.lastName].filter(Boolean).join(" ")} />
              <DetailItem label="Email" value={vendor.user.email} />
              <DetailItem label="Mobile" value={vendor.user.mobile} />
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <h3 className="text-sm font-extrabold text-text-main">Identity KYC</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailItem label="PAN Number" value={vendor.panNumber} />
              <DetailItem label="Aadhaar Number" value={vendor.aadhaarNumber} />
              <DetailItem label="GST Number" value={vendor.gstNumber} />
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <h3 className="text-sm font-extrabold text-text-main">Address</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailItem label="Full Address" value={address} />
              <DetailItem label="Submitted At" value={formatDate(vendor.kycSubmittedAt)} />
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <h3 className="text-sm font-extrabold text-text-main">Bank Details</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <DetailItem label="Account Holder" value={vendor.bankAccountName} />
              <DetailItem label="Account Number" value={vendor.bankAccountNumber} />
              <DetailItem label="IFSC Code" value={vendor.bankIfscCode} />
            </div>
          </section>

          <section className="mt-6 space-y-3">
            <h3 className="text-sm font-extrabold text-text-main">Review Details</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailItem label="Reviewed At" value={formatDate(vendor.kycReviewedAt)} />
              <DetailItem label="Rejection Reason" value={vendor.kycRejectionReason} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("ALL");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminVendor | null>(null);
  const [viewTarget, setViewTarget] = useState<AdminVendor | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<VendorListResponse>("/admin/vendors", {
        params: { search: search || undefined, status: statusFilter === "ALL" ? undefined : statusFilter },
      });
      setVendors(response.data.data || []);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load vendors."));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { void loadVendors(); }, [loadVendors]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const statistics = useMemo(() => {
    const pending = vendors.filter((v) => v.kycStatus === "PENDING").length;
    const approved = vendors.filter((v) => v.kycStatus === "APPROVED").length;
    const rejected = vendors.filter((v) => v.kycStatus === "REJECTED").length;
    const notSubmitted = vendors.filter((v) => v.kycStatus === "NOT_SUBMITTED").length;
    return { total: vendors.length, pending, approved, rejected, notSubmitted };
  }, [vendors]);

  const handleApprove = async (vendor: AdminVendor) => {
    if (vendor.kycStatus === "APPROVED") return;
    try {
      setActionLoadingId(vendor.id);
      await api.patch<VendorActionResponse>(`/admin/vendors/${vendor.id}/approve`);
      setToast({ type: "success", message: "Vendor approved successfully" });
      await loadVendors();
    } catch (error) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Unable to approve vendor") });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectClick = (vendor: AdminVendor) => setRejectTarget(vendor);
  const handleRejectClose = () => setRejectTarget(null);
  const handleRejected = async () => { setRejectTarget(null); setToast({ type: "success", message: "Vendor rejected successfully" }); await loadVendors(); };

  const canApprove = (vendor: AdminVendor) =>
    vendor.kycStatus === "PENDING";

  const canReject = (vendor: AdminVendor) =>
    vendor.kycStatus === "PENDING";

  const canDeactivate = (vendor: AdminVendor) =>
    vendor.kycStatus === "APPROVED" &&
    vendor.user.status === "ACTIVE";

  const canActivate = (vendor: AdminVendor) =>
    vendor.kycStatus === "APPROVED" &&
    vendor.user.status === "INACTIVE";

  const handleToggleActive = async (vendor: AdminVendor) => {
    const isActive = vendor.user.status === "ACTIVE";
    const confirmed = window.confirm(
      isActive
        ? `Deactivate ${getVendorName(vendor)}? KYC will move to pending and they will not be able to log in.`
        : `Activate ${getVendorName(vendor)}? They will be able to log in again.`
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(vendor.id);
      await api.patch<VendorActionResponse>(`/admin/vendors/${vendor.id}/${isActive ? "deactivate" : "activate"}`);
      setToast({ type: "success", message: isActive ? "Vendor deactivated successfully" : "Vendor activated successfully" });
      await loadVendors();
    } catch (error) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Unable to update vendor status") });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteVendor = async (vendor: AdminVendor) => {
    const confirmed = window.confirm(
      `Delete ${getVendorName(vendor)} permanently? This will remove the vendor account and related vendor data.`
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(vendor.id);
      await api.delete(`/admin/vendors/${vendor.id}`);
      setToast({ type: "success", message: "Vendor deleted successfully" });
      await loadVendors();
    } catch (error) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Unable to delete vendor") });
    } finally {
      setActionLoadingId(null);
    }
  };

  const clearFilters = () => { setSearch(""); setStatusFilter("ALL"); };

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed right-5 top-20 z-[90] flex max-w-sm items-start gap-3 rounded-dashboard-card border px-4 py-3 shadow-dashboard-dropdown ${toast.type === "success" ? "border-success/20 bg-success-soft text-success" : "border-danger/20 bg-danger-soft text-danger"}`}>
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${toast.type === "success" ? "bg-success" : "bg-danger"}`}>{toast.type === "success" ? "✓" : "!"}</span>
          <p className="text-sm font-semibold">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100"><CloseIcon /></button>
        </div>
      )}

      <CreateVendorModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreated={loadVendors} />
      <RejectVendorModal open={!!rejectTarget} onClose={handleRejectClose} vendor={rejectTarget} onRejected={handleRejected} />
      <ViewKycModal open={!!viewTarget} onClose={() => setViewTarget(null)} vendor={viewTarget} />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><VendorIcon /></span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">Vendors</h1>
            <p className="mt-1 text-sm text-text-muted">Manage vendor accounts and verification.</p>
          </div>
        </div>
        <button type="button" onClick={() => setIsCreateModalOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-600/20">
          <PlusIcon /> Add Vendor
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard title="Total Vendors" value={statistics.total} description="All registered vendors" iconClass="bg-info-soft text-info" />
        <StatisticCard title="Pending Approval" value={statistics.pending} description="Awaiting verification" iconClass="bg-warning-soft text-warning" />
        <StatisticCard title="Approved" value={statistics.approved} description="Active vendors" iconClass="bg-success-soft text-success" />
        <StatisticCard title="Rejected" value={statistics.rejected} description="Rejected applications" iconClass="bg-danger-soft text-danger" />
      </section>

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Vendor List</h2>
            <p className="mt-1 text-sm text-text-muted">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""} shown</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[320px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft"><SearchIcon /></span>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, email or mobile..." className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as KycStatusFilter)} className="h-11 min-w-[190px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="NOT_SUBMITTED">Not Submitted</option>
            </select>
          </div>
        </div>

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">{pageError}</p>
            <button type="button" onClick={() => void loadVendors()} className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white">Try Again</button>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {["Vendor", "Email", "Mobile", "Joined", "Status", "Actions"].map((heading) => (
                  <th key={heading} className={`px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted ${heading === "Actions" ? "text-right" : "text-left"}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows />
              ) : vendors.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700"><VendorIcon /></span>
                  <h3 className="mt-4 text-base font-extrabold text-text-main">No vendors found</h3>
                  <p className="mt-1 text-sm text-text-muted">Change the filters and try again.</p>
                  {(search || statusFilter !== "ALL") && <button type="button" onClick={clearFilters} className="mt-4 rounded-control border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700">Clear Filters</button>}
                </td></tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-border transition last:border-b-0 hover:bg-surface-soft">
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <strong className="block max-w-[260px] truncate text-sm font-extrabold text-text-main">{getVendorName(vendor)}</strong>
                        <span className="mt-1 block text-xs font-bold text-primary-700">{vendor.businessName}</span>
                        <span className="mt-1 block max-w-[260px] truncate text-xs text-text-muted">{[vendor.user.firstName, vendor.user.lastName].filter(Boolean).join(" ") || "No name"}</span>
                        <span className="mt-2 block max-w-[320px] truncate text-xs font-semibold text-text-secondary">
                          PAN: {vendor.panNumber || "Not submitted"} | Bank: {maskValue(vendor.bankAccountNumber)}
                        </span>
                        <span className="mt-1 block max-w-[320px] truncate text-xs text-text-muted">
                          Address: {[vendor.addressLine, vendor.city, vendor.state, vendor.postalCode].filter(Boolean).join(", ") || "Not submitted"}
                        </span>
                        {vendor.kycRejectionReason && (
                          <span className="mt-1 block max-w-[320px] truncate text-xs font-semibold text-danger">
                            Last rejection: {vendor.kycRejectionReason}
                          </span>
                        )}
                        <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${vendor.user.status === "ACTIVE" ? "bg-success-soft text-success" : vendor.user.status === "INACTIVE" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"}`}>
                          Account: {vendor.user.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-sm text-text-secondary"><MailIcon />{vendor.user.email}</span></td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-sm text-text-secondary"><PhoneIcon />{vendor.user.mobile || "Not added"}</span></td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-sm text-text-secondary"><CalendarIcon />{formatDate(vendor.createdAt)}</span></td>
                    <td className="px-5 py-4"><StatusBadge status={vendor.kycStatus as KycStatusFilter} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => setViewTarget(vendor)} className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-info/30 bg-info-soft px-3 text-xs font-bold text-info transition hover:bg-info/10">
                          <EyeIcon /> View
                        </button>
                        {canApprove(vendor) && (
                          <button type="button" onClick={() => void handleApprove(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-success px-3 text-xs font-bold text-white transition hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60">
                            <span className={actionLoadingId === vendor.id ? "animate-spin" : ""}><CheckIcon /></span> Approve
                          </button>
                        )}
                        {canReject(vendor) && (
                          <button type="button" onClick={() => handleRejectClick(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-danger px-3 text-xs font-bold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60">
                            <TrashIcon /> Reject
                          </button>
                        )}
                        {canDeactivate(vendor) && (
                          <button type="button" onClick={() => void handleToggleActive(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center rounded-control border border-warning/30 bg-warning-soft px-3 text-xs font-bold text-warning transition hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-60">
                            Deactivate
                          </button>
                        )}
                        {canActivate(vendor) && (
                          <button type="button" onClick={() => void handleToggleActive(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center rounded-control border border-success/30 bg-success-soft px-3 text-xs font-bold text-success transition hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-60">
                            Activate
                          </button>
                        )}
                        <button type="button" onClick={() => void handleDeleteVendor(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-danger/30 bg-danger-soft px-3 text-xs font-bold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60">
                          <TrashIcon /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border lg:hidden">
          {loading ? (
            <div className="space-y-4 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted" />)}</div>
          ) : vendors.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700"><VendorIcon /></span>
              <h3 className="mt-4 text-base font-extrabold text-text-main">No vendors found</h3>
              <p className="mt-1 text-sm text-text-muted">Change the filters and try again.</p>
            </div>
          ) : (
            vendors.map((vendor) => (
              <article key={vendor.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-extrabold text-text-main">{getVendorName(vendor)}</strong>
                    <span className="mt-1 block text-xs font-bold text-primary-700">{vendor.businessName}</span>
                    <span className="mt-1 block text-xs text-text-muted">{vendor.user.email}</span>
                    <span className="mt-2 block text-xs font-semibold text-text-secondary">PAN: {vendor.panNumber || "Not submitted"}</span>
                    <span className="mt-1 block text-xs text-text-muted">Bank: {maskValue(vendor.bankAccountNumber)}</span>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${vendor.user.status === "ACTIVE" ? "bg-success-soft text-success" : vendor.user.status === "INACTIVE" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"}`}>
                      Account: {vendor.user.status}
                    </span>
                    <div className="mt-2"><StatusBadge status={vendor.kycStatus as KycStatusFilter} /></div>
                  </div>
                  <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => setViewTarget(vendor)} className="inline-flex h-9 items-center justify-center gap-1 rounded-control border border-info/30 bg-info-soft px-3 text-xs font-bold text-info"><EyeIcon /> View</button>
                  {(canApprove(vendor) || canReject(vendor)) && (
                    <div className="flex gap-2">
                      {canApprove(vendor) && (
                      <button type="button" onClick={() => void handleApprove(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center gap-1 rounded-control bg-success px-3 text-xs font-bold text-white"><CheckIcon /> Approve</button>
                      )}
                      {canReject(vendor) && (
                      <button type="button" onClick={() => handleRejectClick(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center gap-1 rounded-control bg-danger px-3 text-xs font-bold text-white"><TrashIcon /> Reject</button>
                      )}
                    </div>
                  )}
                  {canDeactivate(vendor) && (
                    <button type="button" onClick={() => void handleToggleActive(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center rounded-control border border-warning/30 bg-warning-soft px-3 text-xs font-bold text-warning">
                      Deactivate
                    </button>
                  )}
                  {canActivate(vendor) && (
                    <button type="button" onClick={() => void handleToggleActive(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center rounded-control border border-success/30 bg-success-soft px-3 text-xs font-bold text-success">
                      Activate
                    </button>
                  )}
                  <button type="button" onClick={() => void handleDeleteVendor(vendor)} disabled={actionLoadingId === vendor.id} className="inline-flex h-9 items-center justify-center gap-1 rounded-control border border-danger/30 bg-danger-soft px-3 text-xs font-bold text-danger"><TrashIcon /> Delete</button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

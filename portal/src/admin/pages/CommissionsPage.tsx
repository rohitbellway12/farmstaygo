import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../shared/api/api";

interface VendorCommission {
  id: string;
  bookingAmount: string;
  commissionRate: string;
  commissionAmount: string;
  vendorEarning: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  vendor: {
    id: number;
    businessName: string;
    user: {
      firstName: string;
      lastName: string | null;
      email: string;
    };
  };
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    estimatedTotal: string;
    guestName: string;
    property: {
      title: string;
    };
  };
}

interface VendorCommissionsResponse {
  success: boolean;
  message: string;
  data: VendorCommission[];
  summary: {
    totalCommission: string;
    pendingCommission: string;
    paidCommission: string;
    pendingCount: number;
    paidCount: number;
  };
}

const statusConfig: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: { label: "Pending", badgeClass: "border-warning/20 bg-warning-soft text-warning", dotClass: "bg-warning" },
  PAID: { label: "Paid", badgeClass: "border-success/20 bg-success-soft text-success", dotClass: "bg-success" },
  CANCELLED: { label: "Cancelled", badgeClass: "border-border bg-surface-muted text-text-secondary", dotClass: "bg-text-soft" },
};

const formatDate = (value?: string | null): string => {
  if (!value) return "Not available";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsedDate);
};

const formatMoney = (value: string | number | null, currency = "INR"): string => {
  if (value === null || value === undefined || value === "") return "Pending";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "Pending";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(parsed);
};

const getVendorName = (vendor: VendorCommission["vendor"]): string => {
  const fullName = [vendor.user.firstName, vendor.user.lastName].filter(Boolean).join(" ");
  return vendor.businessName || fullName || "Vendor";
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  return fallbackMessage;
};

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((item) => (
        <tr key={item} className="border-b border-border last:border-b-0">
          <td className="px-5 py-4"><div className="h-4 w-32 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-4 w-40 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-4 w-24 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-4 w-28 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-4 w-28 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-7 w-20 animate-pulse rounded-full bg-surface-muted" /></td>
        </tr>
      ))}
    </>
  );
}

function PayCommissionModal({ open, onClose, commission, onPaid }: { open: boolean; onClose: () => void; commission: VendorCommission | null; onPaid: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  const handlePay = async () => {
    if (!commission) return;
    setError("");
    setSubmitting(true);
    try {
      await api.patch(`/admin/commissions/${commission.id}/pay`);
      onPaid();
      onClose();
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(requestError.response?.data?.message || "Unable to mark commission as paid");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !commission) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface shadow-dashboard-dropdown">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Mark Commission as Paid</h2>
            <p className="mt-1 text-sm text-text-muted">{getVendorName(commission.vendor)}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">✕</button>
        </div>
        {error && <div className="m-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{error}</div>}
        <div className="p-5 space-y-3">
          <div className="rounded-control border border-border bg-surface-soft p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">Booking Amount</span>
            <strong className="mt-1 block text-sm text-text-main">{formatMoney(commission.bookingAmount)}</strong>
          </div>
          <div className="rounded-control border border-border bg-surface-soft p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">Commission Rate</span>
            <strong className="mt-1 block text-sm text-text-main">{commission.commissionRate}%</strong>
          </div>
          <div className="rounded-control border border-border bg-surface-soft p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">Commission Amount</span>
            <strong className="mt-1 block text-sm text-text-main">{formatMoney(commission.commissionAmount)}</strong>
          </div>
          <div className="rounded-control border border-border bg-surface-soft p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">Vendor Earning</span>
            <strong className="mt-1 block text-sm text-text-main">{formatMoney(commission.vendorEarning)}</strong>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border p-5">
          <button type="button" onClick={onClose} className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-muted">Cancel</button>
          <button type="button" onClick={handlePay} disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-success px-5 text-sm font-bold text-white transition hover:bg-success/90 focus:outline-none focus:ring-4 focus:ring-success/20 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Processing..." : "Mark as Paid"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<VendorCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [vendorFilter, setVendorFilter] = useState("");
  const [payTarget, setPayTarget] = useState<VendorCommission | null>(null);

  const loadCommissions = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;
      
      const response = await api.get<VendorCommissionsResponse>("/admin/vendors/commissions", { params });
      setCommissions(response.data.data || []);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load commissions."));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { void loadCommissions(); }, [loadCommissions]);

  const filteredCommissions = useMemo(() => {
    if (!vendorFilter) return commissions;
    const term = vendorFilter.toLowerCase();
    return commissions.filter((c) => {
      const vendorName = getVendorName(c.vendor).toLowerCase();
      const propertyTitle = c.booking.property.title.toLowerCase();
      const guestName = c.booking.guestName.toLowerCase();
      return vendorName.includes(term) || propertyTitle.includes(term) || guestName.includes(term);
    });
  }, [commissions, vendorFilter]);

  const summary = useMemo(() => {
    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    const pendingCommission = commissions.filter((c) => c.status === "PENDING").reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    const paidCommission = commissions.filter((c) => c.status === "PAID").reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    const pendingCount = commissions.filter((c) => c.status === "PENDING").length;
    const paidCount = commissions.filter((c) => c.status === "PAID").length;
    return { totalCommission, pendingCommission, paidCommission, pendingCount, paidCount };
  }, [commissions]);

  const handlePay = (commission: VendorCommission) => setPayTarget(commission);
  const handlePaid = async () => { setPayTarget(null); await loadCommissions(); };

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success"><DollarIcon /></span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">Commissions</h1>
            <p className="mt-1 text-sm text-text-muted">Track platform commission across all vendors.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Total Commission</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">{formatMoney(summary.totalCommission)}</strong>
          <span className="mt-2 block text-xs text-text-muted">{commissions.length} records</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Pending Commission</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-warning">{formatMoney(summary.pendingCommission)}</strong>
          <span className="mt-2 block text-xs text-text-muted">{summary.pendingCount} pending</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Paid Commission</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-success">{formatMoney(summary.paidCommission)}</strong>
          <span className="mt-2 block text-xs text-text-muted">{summary.paidCount} paid</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Commission Records</h2>
            <p className="mt-1 text-sm text-text-muted">{filteredCommissions.length} record{filteredCommissions.length !== 1 ? "s" : ""} shown</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[320px]">
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, property, guest..." className="h-11 w-full rounded-control border border-border bg-surface pl-4 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 min-w-[190px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input type="text" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} placeholder="Filter by vendor..." className="h-11 min-w-[180px] rounded-control border border-border bg-surface px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
          </div>
        </div>

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">{pageError}</p>
            <button type="button" onClick={() => void loadCommissions()} className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white">Try Again</button>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {["Vendor", "Property", "Guest", "Booking Amount", "Commission", "Vendor Earning", "Status", "Actions"].map((heading) => (
                  <th key={heading} className={`px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted ${heading === "Actions" ? "text-right" : "text-left"}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filteredCommissions.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success"><DollarIcon /></span>
                  <h3 className="mt-4 text-base font-extrabold text-text-main">No commissions found</h3>
                  <p className="mt-1 text-sm text-text-muted">Commissions will appear here after bookings are completed and paid.</p>
                </td></tr>
              ) : (
                filteredCommissions.map((commission) => (
                  <tr key={commission.id} className="border-b border-border transition last:border-b-0 hover:bg-surface-soft">
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <strong className="block max-w-[260px] truncate text-sm font-extrabold text-text-main">{getVendorName(commission.vendor)}</strong>
                        <span className="mt-1 block text-xs text-text-muted">{commission.vendor.user.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block max-w-[260px] truncate text-sm font-extrabold text-text-main">{commission.booking.property.title}</strong>
                      <span className="mt-1 block text-xs text-text-muted">{formatDate(commission.booking.checkIn)} - {formatDate(commission.booking.checkOut)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{commission.booking.guestName}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{formatMoney(commission.bookingAmount)}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{formatMoney(commission.commissionAmount)}</strong>
                      <span className="mt-1 block text-xs text-text-muted">{commission.commissionRate}%</span>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{formatMoney(commission.vendorEarning)}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${statusConfig[commission.status]?.badgeClass || statusConfig.PENDING.badgeClass}`}>
                        <span className={`h-2 w-2 rounded-full ${statusConfig[commission.status]?.dotClass || statusConfig.PENDING.dotClass}`} />
                        {statusConfig[commission.status]?.label || commission.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {commission.status === "PENDING" && (
                          <button type="button" onClick={() => handlePay(commission)} className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-success px-3 text-xs font-bold text-white transition hover:bg-success/90">
                            Mark Paid
                          </button>
                        )}
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
          ) : filteredCommissions.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success"><DollarIcon /></span>
              <h3 className="mt-4 text-base font-extrabold text-text-main">No commissions found</h3>
              <p className="mt-1 text-sm text-text-muted">Commissions will appear here after bookings are completed and paid.</p>
            </div>
          ) : (
            filteredCommissions.map((commission) => (
              <article key={commission.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-extrabold text-text-main">{getVendorName(commission.vendor)}</strong>
                    <span className="mt-1 block text-xs text-text-muted">{commission.booking.property.title}</span>
                    <span className="mt-1 block text-xs text-text-muted">Guest: {commission.booking.guestName}</span>
                    <span className="mt-2 block text-xs font-semibold text-text-secondary">Booking: {formatMoney(commission.bookingAmount)}</span>
                    <span className="mt-1 block text-xs font-semibold text-text-secondary">Commission: {formatMoney(commission.commissionAmount)} ({commission.commissionRate}%)</span>
                    <span className="mt-1 block text-xs font-semibold text-success">Vendor earns: {formatMoney(commission.vendorEarning)}</span>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${statusConfig[commission.status]?.badgeClass || statusConfig.PENDING.badgeClass}`}>
                      {statusConfig[commission.status]?.label || commission.status}
                    </span>
                  </div>
                  {commission.status === "PENDING" && (
                    <button type="button" onClick={() => handlePay(commission)} className="inline-flex h-9 items-center justify-center gap-1 rounded-control bg-success px-3 text-xs font-bold text-white">Mark Paid</button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <PayCommissionModal open={!!payTarget} onClose={() => setPayTarget(null)} commission={payTarget} onPaid={handlePaid} />
    </div>
  );
}

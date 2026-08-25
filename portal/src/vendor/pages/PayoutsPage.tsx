import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../shared/api/api";

interface Payout {
  id: string;
  bookingAmount: string;
  commissionRate: string;
  commissionAmount: string;
  vendorEarning: string;
  status: string;
  paidAt: string | null;
  transactionId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    property: {
      title: string;
    };
  };
}

interface PayoutsResponse {
  success: boolean;
  message: string;
  data: Payout[];
}

const statusConfig: Record<
  string,
  { label: string; badgeClass: string }
> = {
  PENDING: { label: "Pending", badgeClass: "border-warning/20 bg-warning-soft text-warning" },
  PAID: { label: "Paid", badgeClass: "border-success/20 bg-success-soft text-success" },
  CANCELLED: { label: "Cancelled", badgeClass: "border-border bg-surface-muted text-text-secondary" },
};

const paymentMethodConfig: Record<string, { label: string }> = {
  ONLINE: { label: "Online" },
  CASH: { label: "Cash" },
  BANK_TRANSFER: { label: "Bank Transfer" },
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

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  return fallbackMessage;
};

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 7v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 1 0 4" />
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
          <td className="px-5 py-4"><div className="h-7 w-20 animate-pulse rounded-full bg-surface-muted" /></td>
        </tr>
      ))}
    </>
  );
}

export default function VendorPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<PayoutsResponse>("/vendor/payouts");
      setPayouts(response.data.data || []);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load payouts."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPayouts(); }, [loadPayouts]);

  const filteredPayouts = useMemo(() => {
    let result = payouts;
    if (statusFilter !== "ALL") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter((p) => {
        const propertyTitle = p.booking.property.title.toLowerCase();
        const guestName = p.booking.guestName.toLowerCase();
        return propertyTitle.includes(term) || guestName.includes(term);
      });
    }
    return result;
  }, [payouts, search, statusFilter]);

  const summary = useMemo(() => {
    const totalEarnings = payouts.reduce((sum, p) => sum + Number(p.vendorEarning), 0);
    const pendingEarnings = payouts.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + Number(p.vendorEarning), 0);
    const paidEarnings = payouts.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.vendorEarning), 0);
    const totalPlatformCommission = payouts.reduce((sum, p) => sum + Number(p.commissionAmount), 0);
    return { totalEarnings, pendingEarnings, paidEarnings, totalPlatformCommission };
  }, [payouts]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><WalletIcon /></span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">My Payouts</h1>
            <p className="mt-1 text-sm text-text-muted">Track your earnings. Guest payments are split: platform keeps a commission, you receive the rest.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Total Payouts Received</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-success">{formatMoney(summary.totalEarnings)}</strong>
          <span className="mt-2 block text-xs text-text-muted">{payouts.length} payouts</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Pending Payout</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-warning">{formatMoney(summary.pendingEarnings)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Awaiting payment</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Paid Out</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">{formatMoney(summary.paidEarnings)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Settled</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Platform Commission Deducted</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-danger">{formatMoney(summary.totalPlatformCommission)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Platform cut</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Payout History</h2>
            <p className="mt-1 text-sm text-text-muted">{filteredPayouts.length} record{filteredPayouts.length !== 1 ? "s" : ""} shown</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[320px]">
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search property or guest..." className="h-11 w-full rounded-control border border-border bg-surface pl-4 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 min-w-[190px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">{pageError}</p>
            <button type="button" onClick={() => void loadPayouts()} className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white">Try Again</button>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {["Property", "Guest", "Dates", "Booking Amount", "Platform Fee", "Your Payout", "Status", "Transaction", "Paid At"].map((heading) => (
                  <th key={heading} className="px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filteredPayouts.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700"><WalletIcon /></span>
                  <h3 className="mt-4 text-base font-extrabold text-text-main">No payouts yet</h3>
                  <p className="mt-1 text-sm text-text-muted">Payout records will appear here after bookings are paid.</p>
                </td></tr>
              ) : (
                filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-border transition last:border-b-0 hover:bg-surface-soft">
                    <td className="px-5 py-4">
                      <strong className="block max-w-[200px] truncate text-sm font-extrabold text-text-main">{payout.booking.property.title}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{payout.booking.guestName}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-text-muted">{formatDate(payout.booking.checkIn)} - {formatDate(payout.booking.checkOut)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{formatMoney(payout.bookingAmount)}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-danger">{formatMoney(payout.commissionAmount)}</strong>
                      <span className="mt-1 block text-xs text-text-muted">{payout.commissionRate}%</span>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-success">{formatMoney(payout.vendorEarning)}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${statusConfig[payout.status]?.badgeClass || statusConfig.PENDING.badgeClass}`}>
                        {statusConfig[payout.status]?.label || payout.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {payout.transactionId && payout.status === "PAID" ? (
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-text-main">{payout.transactionId}</span>
                          <span className="mt-1 block text-xs text-text-muted">
                            {paymentMethodConfig[payout.paymentMethod ?? ""]?.label ?? payout.paymentMethod ?? ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-text-muted">{payout.paidAt ? formatDate(payout.paidAt) : "Pending"}</span>
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
          ) : filteredPayouts.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700"><WalletIcon /></span>
              <h3 className="mt-4 text-base font-extrabold text-text-main">No payouts yet</h3>
              <p className="mt-1 text-sm text-text-muted">Payout records will appear here after bookings are paid.</p>
            </div>
          ) : (
            filteredPayouts.map((payout) => (
              <article key={payout.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-extrabold text-text-main">{payout.booking.property.title}</strong>
                    <span className="mt-1 block text-xs text-text-muted">Guest: {payout.booking.guestName}</span>
                    <span className="mt-1 block text-xs text-text-muted">{formatDate(payout.booking.checkIn)} - {formatDate(payout.booking.checkOut)}</span>
                    <span className="mt-2 block text-xs font-semibold text-text-secondary">Booking: {formatMoney(payout.bookingAmount)}</span>
                    <span className="mt-1 block text-xs font-semibold text-danger">Platform fee: {formatMoney(payout.commissionAmount)} ({payout.commissionRate}%)</span>
                    <span className="mt-1 block text-xs font-semibold text-success">Your payout: {formatMoney(payout.vendorEarning)}</span>
                    {payout.transactionId && payout.status === "PAID" && (
                      <span className="mt-1 block text-xs text-text-muted">Txn: {payout.transactionId} ({paymentMethodConfig[payout.paymentMethod ?? ""]?.label ?? payout.paymentMethod ?? ""})</span>
                    )}
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${statusConfig[payout.status]?.badgeClass || statusConfig.PENDING.badgeClass}`}>
                      {statusConfig[payout.status]?.label || payout.status}
                    </span>
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

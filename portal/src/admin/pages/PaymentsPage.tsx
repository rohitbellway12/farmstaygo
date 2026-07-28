import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../shared/api/api";

interface BookingForPayments {
  id: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  property: {
    title: string;
    city: string | null;
    state: string | null;
    vendor: {
      businessName: string;
      user: {
        email: string;
      };
    };
  };
  payments: Array<{
    id: string;
    amount: string;
    paymentMethod: string;
    paymentType: string;
    status: string;
    transactionId: string | null;
    notes: string | null;
    createdAt: string;
  }>;
}

interface Payment {
  id: string;
  amount: string;
  paymentMethod: string;
  paymentType: string;
  status: string;
  transactionId: string | null;
  notes: string | null;
  createdAt: string;
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    property: {
      title: string;
      city: string | null;
      state: string | null;
      vendor: {
        businessName: string;
        user: {
          email: string;
        };
      };
    };
  };
}

interface BookingsResponse {
  success: boolean;
  message: string;
  data: BookingForPayments[];
  total: number;
}

const paymentStatusStyles: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  REFUNDED: "border-slate-200 bg-slate-100 text-slate-700",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function CreditCardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
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

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<BookingsResponse>("/admin/bookings");
      const allBookings = response.data.data || [];
      const paymentsMap = new Map<string, Payment>();
      
      allBookings.forEach((booking) => {
        booking.payments?.forEach((payment) => {
          const existing = paymentsMap.get(payment.id);
          if (!existing || new Date(payment.createdAt) > new Date(existing.createdAt)) {
            paymentsMap.set(payment.id, {
              ...payment,
              booking: {
                id: booking.id,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                guestName: booking.guestName,
                property: {
                  title: booking.property.title,
                  city: booking.property.city,
                  state: booking.property.state,
                  vendor: booking.property.vendor,
                },
              } as Payment["booking"],
            });
          }
        });
      });
      
      const allPayments = Array.from(paymentsMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPayments(allPayments);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load payments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPayments(); }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    if (!search) return payments;
    const term = search.toLowerCase();
    return payments.filter((p) => {
      const vendorName = p.booking.property.vendor.businessName.toLowerCase();
      const propertyTitle = p.booking.property.title.toLowerCase();
      const guestName = p.booking.guestName.toLowerCase();
      const txId = (p.transactionId || "").toLowerCase();
      return vendorName.includes(term) || propertyTitle.includes(term) || guestName.includes(term) || txId.includes(term);
    });
  }, [payments, search]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === "ALL") return filteredPayments;
    return filteredPayments.filter((p) => p.status === statusFilter);
  }, [filteredPayments, statusFilter]);

  const summary = useMemo(() => {
    const totalAmount = filteredByStatus.reduce((sum, p) => sum + Number(p.amount), 0);
    const completedAmount = filteredByStatus.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = filteredByStatus.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + Number(p.amount), 0);
    return { total: filteredByStatus.length, totalAmount, completedAmount, pendingAmount };
  }, [filteredByStatus]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-info-soft text-info"><CreditCardIcon /></span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">Payments</h1>
            <p className="mt-1 text-sm text-text-muted">View all payment transactions across the platform.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Total Payments</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">{summary.total}</strong>
          <span className="mt-2 block text-xs text-text-muted">Transactions</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Total Amount</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">{formatMoney(summary.totalAmount)}</strong>
          <span className="mt-2 block text-xs text-text-muted">All transactions</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Completed</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-success">{formatMoney(summary.completedAmount)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Successful payments</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Pending</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-warning">{formatMoney(summary.pendingAmount)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Awaiting completion</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">Payment Transactions</h2>
            <p className="mt-1 text-sm text-text-muted">{filteredByStatus.length} transaction{filteredByStatus.length !== 1 ? "s" : ""} shown</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[320px]">
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, property, guest, TX ID..." className="h-11 w-full rounded-control border border-border bg-surface pl-4 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 min-w-[190px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">{pageError}</p>
            <button type="button" onClick={() => void loadPayments()} className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white">Try Again</button>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {["Transaction ID", "Property", "Vendor", "Guest", "Amount", "Method", "Type", "Status", "Date"].map((heading) => (
                  <th key={heading} className="px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filteredByStatus.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-16 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-info-soft text-info"><CreditCardIcon /></span>
                  <h3 className="mt-4 text-base font-extrabold text-text-main">No payments found</h3>
                  <p className="mt-1 text-sm text-text-muted">Payment transactions will appear here.</p>
                </td></tr>
              ) : (
                filteredByStatus.map((payment) => (
                  <tr key={payment.id} className="border-b border-border transition last:border-b-0 hover:bg-surface-soft">
                    <td className="px-5 py-4">
                      <span className="block max-w-[140px] truncate text-xs font-mono font-bold text-text-secondary">{payment.transactionId || payment.id.slice(-8)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block max-w-[200px] truncate text-sm font-extrabold text-text-main">{payment.booking.property.title}</strong>
                      <span className="mt-1 block text-xs text-text-muted">{[payment.booking.property.city, payment.booking.property.state].filter(Boolean).join(", ") || "Location N/A"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block max-w-[160px] truncate text-sm font-extrabold text-text-main">{payment.booking.property.vendor.businessName}</strong>
                      <span className="mt-1 block text-xs text-text-muted">{payment.booking.property.vendor.user.email}</span>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{payment.booking.guestName}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">{formatMoney(payment.amount)}</strong>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-text-secondary">{payment.paymentMethod}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-text-secondary">{payment.paymentType}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${paymentStatusStyles[payment.status] || paymentStatusStyles.PENDING}`}>
                        {paymentStatusLabels[payment.status] || payment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-text-muted">{formatDate(payment.createdAt)}</span>
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
          ) : filteredByStatus.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-info-soft text-info"><CreditCardIcon /></span>
              <h3 className="mt-4 text-base font-extrabold text-text-main">No payments found</h3>
              <p className="mt-1 text-sm text-text-muted">Payment transactions will appear here.</p>
            </div>
          ) : (
            filteredByStatus.map((payment) => (
              <article key={payment.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-extrabold text-text-main">{payment.booking.property.title}</strong>
                    <span className="mt-1 block text-xs text-text-muted">Vendor: {payment.booking.property.vendor.businessName}</span>
                    <span className="mt-1 block text-xs text-text-muted">Guest: {payment.booking.guestName}</span>
                    <span className="mt-2 block text-xs font-semibold text-text-secondary">Amount: {formatMoney(payment.amount)}</span>
                    <span className="mt-1 block text-xs text-text-muted">{payment.paymentMethod} | {payment.paymentType}</span>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${paymentStatusStyles[payment.status] || paymentStatusStyles.PENDING}`}>
                      {paymentStatusLabels[payment.status] || payment.status}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted">{formatDate(payment.createdAt)}</span>
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

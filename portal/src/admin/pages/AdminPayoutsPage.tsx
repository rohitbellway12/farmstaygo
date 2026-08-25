import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../shared/api/api";

interface VendorPayout {
  id: string;
  vendorId: number;
  bookingId: string;
  bookingAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorEarning: number;
  status: string;
  paidAt: string | null;
  transactionId: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: number;
    businessName: string;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankIfscCode: string | null;
    totalEarnings: number;
    user: {
      id: number;
      firstName: string;
      lastName: string | null;
      email: string;
      mobile: string | null;
    };
  };
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    estimatedTotal: number;
    guestName: string;
    guestEmail: string;
    guestMobile: string | null;
    property: {
      id: string;
      title: string;
      city: string | null;
      state: string | null;
    };
  };
  paidBy: {
    id: number;
    firstName: string;
    lastName: string | null;
    email: string;
  } | null;
}

interface PayoutsResponse {
  success: boolean;
  message: string;
  data: VendorPayout[];
}

const statusConfig: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: "Pending",
    badgeClass:
      "border-warning/20 bg-warning-soft text-warning",
    dotClass: "bg-warning",
  },
  PAID: {
    label: "Paid",
    badgeClass:
      "border-success/20 bg-success-soft text-success",
    dotClass: "bg-success",
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass:
      "border-border bg-surface-muted text-text-secondary",
    dotClass: "bg-text-soft",
  },
};

const paymentMethodConfig: Record<
  string,
  { label: string }
> = {
  ONLINE: { label: "Online" },
  CASH: { label: "Cash" },
  BANK_TRANSFER: { label: "Bank Transfer" },
};

const formatDate = (value?: string | null): string => {
  if (!value) return "Not available";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

const formatMoney = (
  value: string | number | null,
  currency = "INR"
): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(parsed);
};

const getVendorName = (
  vendor: VendorPayout["vendor"]
): string => {
  const fullName = [vendor.user.firstName, vendor.user.lastName]
    .filter(Boolean)
    .join(" ");
  return vendor.businessName || fullName || "Vendor";
};

const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallbackMessage
    );
  }
  return fallbackMessage;
};

function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 7v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 1 0 4" />
    </svg>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((item) => (
        <tr
          key={item}
          className="border-b border-border last:border-b-0"
        >
          <td className="px-5 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
          </td>
          <td className="px-5 py-4">
            <div className="h-7 w-20 animate-pulse rounded-full bg-surface-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}

function PayPayoutModal({
  open,
  onClose,
  payout,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  payout: VendorPayout | null;
  onPaid: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setSubmitting(false);
      setTransactionId("");
      setPaymentMethod("BANK_TRANSFER");
      setNotes("");
    }
  }, [open]);

  const handlePay = async () => {
    if (!payout) return;
    if (!transactionId.trim()) {
      setError("Transaction ID is required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.post(
        `/admin/payouts/${payout.id}/pay`,
        {
          transactionId: transactionId.trim(),
          paymentMethod: paymentMethod.trim(),
          notes: notes.trim() || undefined,
        }
      );
      onPaid();
      onClose();
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(
          requestError.response?.data?.message ||
            "Unable to process payout"
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !payout) return null;

  const vendorName = getVendorName(payout.vendor);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface shadow-dashboard-dropdown">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Process Payout
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {vendorName} — Pay vendor for booking
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="rounded-control border border-border bg-surface-soft p-4">
            <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">
              Payout Breakdown
            </span>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Booking Amount (Guest Paid)</span>
                <span className="text-sm font-extrabold text-text-main">{formatMoney(payout.bookingAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Platform Commission ({payout.commissionRate}%)</span>
                <span className="text-sm font-extrabold text-danger">-{formatMoney(payout.commissionAmount)}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-main">Vendor Payout</span>
                  <span className="text-base font-extrabold text-success">{formatMoney(payout.vendorEarning)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-control border border-border bg-surface-soft p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">
              Vendor Bank Details
            </span>
            <div className="mt-1 space-y-0.5 text-xs text-text-secondary">
              <p>
                Account Holder:{" "}
                <strong className="font-semibold text-text-main">
                  {payout.vendor.bankAccountName || "Not set"}
                </strong>
              </p>
              <p>
                Account Number:{" "}
                <strong className="font-semibold text-text-main">
                  {payout.vendor.bankAccountNumber || "Not set"}
                </strong>
              </p>
              <p>
                IFSC:{" "}
                <strong className="font-semibold text-text-main">
                  {payout.vendor.bankIfscCode || "Not set"}
                </strong>
              </p>
            </div>
          </div>

          <div className="rounded-control border border-border bg-surface-soft p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-text-muted">
              Booking Details
            </span>
            <p className="mt-1 text-sm text-text-main">
              {payout.booking.property.title} —{" "}
              {payout.booking.guestName}
            </p>
            <p className="text-xs text-text-muted">
              {formatDate(payout.booking.checkIn)} –{" "}
              {formatDate(payout.booking.checkOut)}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-text-muted">
                Transaction ID *
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) =>
                  setTransactionId(e.target.value)
                }
                placeholder="e.g. UPI1234567890 or NEFT-REF-001"
                className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-text-muted">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
                className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              >
                <option value="BANK_TRANSFER">
                  Bank Transfer
                </option>
                <option value="ONLINE">
                  Online / UPI
                </option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-text-muted">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any remarks..."
                rows={3}
                className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePay}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-success px-5 text-sm font-bold text-white transition hover:bg-success/90 focus:outline-none focus:ring-4 focus:ring-success/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Processing..." : "Process Payout"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [payTarget, setPayTarget] = useState<VendorPayout | null>(null);

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const response = await api.get<PayoutsResponse>(
        "/admin/payouts",
        { params }
      );
      setPayouts(response.data.data || []);
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, "Unable to load payouts.")
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const filteredPayouts = useMemo(() => {
    return payouts;
  }, [payouts]);

  const summary = useMemo(() => {
    const totalBookingAmount = payouts.reduce(
      (sum, p) => sum + p.bookingAmount,
      0
    );
    const totalPlatformCommission = payouts.reduce(
      (sum, p) => sum + p.commissionAmount,
      0
    );
    const totalVendorPayout = payouts.reduce(
      (sum, p) => sum + p.vendorEarning,
      0
    );
    const pending = payouts
      .filter((p) => p.status === "PENDING")
      .reduce((sum, p) => sum + p.vendorEarning, 0);
    const paid = payouts
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.vendorEarning, 0);
    const pendingCount = payouts.filter(
      (p) => p.status === "PENDING"
    ).length;
    const paidCount = payouts.filter(
      (p) => p.status === "PAID"
    ).length;

    return {
      totalBookingAmount,
      totalPlatformCommission,
      totalVendorPayout,
      pending,
      paid,
      pendingCount,
      paidCount,
    };
  }, [payouts]);

  const handlePay = (payout: VendorPayout) => {
    setPayTarget(payout);
  };

  const handlePaid = async () => {
    setPayTarget(null);
    await loadPayouts();
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success">
            <WalletIcon />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">
              Vendor Payouts
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Track and process vendor payments. Booking amount is split between platform commission and vendor payout.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">
            Total Booking Amount
          </span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">
            {formatMoney(summary.totalBookingAmount)}
          </strong>
          <span className="mt-2 block text-xs text-text-muted">
            {payouts.length} bookings
          </span>
        </div>

        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">
            Platform Commission
          </span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-success">
            {formatMoney(summary.totalPlatformCommission)}
          </strong>
          <span className="mt-2 block text-xs text-text-muted">
            Platform income
          </span>
        </div>

        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">
            Paid to Vendors
          </span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-primary-700">
            {formatMoney(summary.paid)}
          </strong>
          <span className="mt-2 block text-xs text-text-muted">
            {summary.paidCount} payouts settled
          </span>
        </div>

        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">
            Pending Payout
          </span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-warning">
            {formatMoney(summary.pending)}
          </strong>
          <span className="mt-2 block text-xs text-text-muted">
            {summary.pendingCount} awaiting payment
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Payout Records
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {filteredPayouts.length} record
              {filteredPayouts.length !== 1 ? "s" : ""}{" "}
              shown
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[320px]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor, property, guest, transaction..."
                className="h-11 w-full rounded-control border border-border bg-surface pl-4 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 min-w-[190px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">
              {pageError}
            </p>
            <button
              type="button"
              onClick={() => void loadPayouts()}
              className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {[
                  "Vendor",
                  "Property",
                  "Guest",
                  "Booking Amount",
                  "Platform Commission",
                  "Vendor Payout",
                  "Status",
                  "Transaction",
                  "Paid At",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className={`px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted ${
                      heading === "Actions"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filteredPayouts.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-16 text-center"
                  >
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
                      <WalletIcon />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold text-text-main">
                      No payouts found
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      Payout records will appear here after
                      bookings are completed.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((payout) => (
                  <tr
                    key={payout.id}
                    className="border-b border-border transition last:border-b-0 hover:bg-surface-soft"
                  >
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <strong className="block max-w-[240px] truncate text-sm font-extrabold text-text-main">
                          {getVendorName(payout.vendor)}
                        </strong>
                        <span className="mt-1 block text-xs text-text-muted">
                          {payout.vendor.user.email}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <strong className="block max-w-[200px] truncate text-sm font-extrabold text-text-main">
                        {payout.booking.property.title}
                      </strong>
                      <span className="mt-1 block text-xs text-text-muted">
                        {formatDate(payout.booking.checkIn)} –{" "}
                        {formatDate(payout.booking.checkOut)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">
                        {payout.booking.guestName}
                      </strong>
                    </td>

                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">
                        {formatMoney(payout.bookingAmount)}
                      </strong>
                    </td>

                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-success">
                        {formatMoney(payout.commissionAmount)}
                      </strong>
                      <span className="mt-1 block text-xs text-text-muted">
                        Platform keeps ({payout.commissionRate}%)
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <strong className="block text-sm font-extrabold text-text-main">
                        {formatMoney(payout.vendorEarning)}
                      </strong>
                      <span className="mt-1 block text-xs text-text-muted">
                        Vendor receives
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
                          statusConfig[payout.status]?.badgeClass ||
                          statusConfig.PENDING.badgeClass
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            statusConfig[payout.status]?.dotClass ||
                            statusConfig.PENDING.dotClass
                          }`}
                        />
                        {statusConfig[payout.status]?.label ||
                          payout.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {payout.transactionId ? (
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-text-main">
                            {payout.transactionId}
                          </span>
                          <span className="mt-1 block text-xs text-text-muted">
                            {paymentMethodConfig[payout.paymentMethod ?? ""]
                              ?.label ??
                              payout.paymentMethod ??
                              "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">
                          Not processed
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-xs text-text-muted">
                        {payout.paidAt
                          ? formatDate(payout.paidAt)
                          : "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {(!payout.transactionId) && (
                          <button
                            type="button"
                            onClick={() => handlePay(payout)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-success px-3 text-xs font-bold text-white transition hover:bg-success/90"
                          >
                            Pay Out
                          </button>
                        )}
                        {payout.transactionId && (
                          <span className="text-xs text-text-muted">Processed</span>
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
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted"
                />
              ))}
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
                <WalletIcon />
              </span>
              <h3 className="mt-4 text-base font-extrabold text-text-main">
                No payouts found
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Payout records will appear here after bookings
                are completed.
              </p>
            </div>
          ) : (
            filteredPayouts.map((payout) => (
              <article key={payout.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-extrabold text-text-main">
                      {getVendorName(payout.vendor)}
                    </strong>
                    <span className="mt-1 block text-xs text-text-muted">
                      {payout.booking.property.title} ·{" "}
                      {payout.booking.guestName}
                    </span>
                    <span className="mt-1 block text-xs text-text-muted">
                      {formatDate(payout.booking.checkIn)} –{" "}
                      {formatDate(payout.booking.checkOut)}
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-text-secondary">
                      Booking: {formatMoney(payout.bookingAmount)}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-danger">
                      Platform commission:{" "}
                      {formatMoney(payout.commissionAmount)}{" "}
                      ({payout.commissionRate}%)
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-success">
                      Vendor payout:{" "}
                      {formatMoney(payout.vendorEarning)}
                    </span>
                    {payout.transactionId && (
                      <span className="mt-1 block text-xs text-text-muted">
                        Txn: {payout.transactionId}
                      </span>
                    )}
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        statusConfig[payout.status]?.badgeClass ||
                        statusConfig.PENDING.badgeClass
                      }`}
                    >
                      {statusConfig[payout.status]?.label ||
                        payout.status}
                    </span>
                  </div>

                  {(!payout.transactionId) && (
                    <button
                      type="button"
                      onClick={() => handlePay(payout)}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-control bg-success px-3 text-xs font-bold text-white"
                    >
                      Pay Out
                    </button>
                  )}
                  {payout.transactionId && (
                    <span className="text-xs text-text-muted">Processed</span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <PayPayoutModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        payout={payTarget}
        onPaid={handlePaid}
      />
    </div>
  );
}

import axios from "axios";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getToken } from "../utils/auth";

import api from "../api/api";

type BookingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "CANCELLED"
  | "REJECTED"
  | "COMPLETED";

type BookingMode =
  | "ENTIRE_PROPERTY"
  | "ROOM_WISE";

interface Booking {
  id: string;
  status: BookingStatus;
  bookingMode: BookingMode;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalNights: number;
  estimatedTotal: string | number | null;
  reservationAmount: string | number | null;
  paymentStatus: string | null;
  currency: string;
  specialRequest: string | null;
  createdAt: string;
  guestName: string;
  guestEmail: string;
  guestMobile: string | null;
  property: {
    id: string;
    title: string;
    bookingType: string;
    city: string | null;
    state: string | null;
    category: {
      name: string;
    };
    vendor: {
      id: number;
      businessName: string;
      user: {
        firstName: string;
        lastName: string | null;
        email: string;
        mobile: string | null;
      };
    };
  };
  roomType: {
    id: string;
    name: string;
    totalRooms: number;
  } | null;
  payments: Array<{
    id: string;
    amount: string | number;
    paymentMethod: string;
    paymentType: string;
    status: string;
    transactionId: string | null;
    notes: string | null;
    createdAt: string;
  }>;
  adminCommission: string | number | null;
  vendorCommission: string | number | null;
  commissions: Array<{
    id: string;
    bookingAmount: string;
    commissionRate: string;
    commissionAmount: string;
    vendorEarning: string;
    status: string;
  }>;
}

interface BookingsResponse {
  success: boolean;
  message: string;
  data: Booking[];
  total: number;
}

interface BookingsViewProps {
  endpoint: string;
  title: string;
  description: string;
  showVendor: boolean;
  allowActions?: boolean;
  allowCashPayment?: boolean;
  onAccept?: (bookingId: string) => void;
  onReject?: (bookingId: string) => void;
  onPay?: (bookingId: string) => void;
}

const statusStyles: Record<
  BookingStatus,
  string
> = {
  REQUESTED:
    "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED:
    "border-slate-200 bg-slate-100 text-slate-700",
  REJECTED:
    "border-red-200 bg-red-50 text-red-700",
  COMPLETED:
    "border-blue-200 bg-blue-50 text-blue-700",
};

const statusLabels: Record<
  BookingStatus,
  string
> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

const modeLabels: Record<BookingMode, string> =
  {
    ENTIRE_PROPERTY: "Full property",
    ROOM_WISE: "Room-wise",
  };

const paymentStatusStyles: Record<
  string,
  string
> = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700",
  PARTIAL:
    "border-blue-200 bg-blue-50 text-blue-700",
  PAID:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  REFUNDED:
    "border-slate-200 bg-slate-100 text-slate-700",
};

const paymentStatusLabels: Record<
  string,
  string
> = {
  PENDING: "Payment pending",
  PARTIAL: "Partial paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatMoney = (
  value: string | number | null,
  currency: string
): string => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Pending";
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(parsed);
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export default function BookingsView({
  endpoint,
  title,
  description,
  showVendor,
  allowActions,
  allowCashPayment,
  onAccept,
  onReject,
  onPay,
}: BookingsViewProps) {
  const [bookings, setBookings] = useState<
    Booking[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, _setActionLoading] =
    useState<string | null>(null);
  const [showCashModal, setShowCashModal] =
    useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashPaymentMethod, setCashPaymentMethod] =
    useState("CASH");
  const [cashTransactionId, setCashTransactionId] =
    useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [cashSubmitting, setCashSubmitting] =
    useState(false);
  const [cashError, setCashError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await api.get<BookingsResponse>(
            endpoint
          );

        if (!cancelled) {
          setBookings(
            response.data.data || []
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            getErrorMessage(
              requestError,
              "Unable to load bookings."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBookings();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const counts = useMemo(() => {
    return bookings.reduce(
      (summary, booking) => {
        summary.total += 1;
        summary[booking.status] += 1;
        return summary;
      },
      {
        total: 0,
        REQUESTED: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
        REJECTED: 0,
        COMPLETED: 0,
      } as Record<BookingStatus | "total", number>
    );
  }, [bookings]);

  return (
    <section className="space-y-5">
      <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-ui-xl font-extrabold text-text-main">
              {title}
            </h1>

            <p className="mt-1 max-w-2xl text-ui-sm text-text-muted">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <StatPill
              label="Total"
              value={counts.total}
            />
            <StatPill
              label="Requested"
              value={counts.REQUESTED}
            />
            <StatPill
              label="Confirmed"
              value={counts.CONFIRMED}
            />
            <StatPill
              label="Rejected"
              value={counts.REJECTED}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-dashboard-card border border-border bg-surface shadow-dashboard-card"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-dashboard-card border border-red-100 bg-surface p-5 text-ui-sm font-bold text-red-600 shadow-dashboard-card">
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-dashboard-card border border-border bg-surface p-8 text-center shadow-dashboard-card">
          <h2 className="text-ui-lg font-extrabold text-text-main">
            No bookings yet
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-ui-sm text-text-muted">
            New customer booking requests will appear
            here as soon as they are submitted.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left">
              <thead className="border-b border-border bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                    Booking
                  </th>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                    Guest
                  </th>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                    Dates
                  </th>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                    Type
                  </th>
                  {showVendor && (
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                      Vendor
                    </th>
                  )}
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                    Status
                  </th>
                  {allowActions && (
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-muted">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {bookings.map((booking) => {
                  const location = [
                    booking.property.city,
                    booking.property.state,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr
                      key={booking.id}
                      className="align-top"
                    >
                      <td className="px-4 py-4">
                        <p className="font-extrabold text-text-main">
                          {booking.property.title}
                        </p>
                        <p className="mt-1 text-ui-xs text-text-muted">
                          {booking.property.category.name}
                          {location
                            ? ` - ${location}`
                            : ""}
                        </p>
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-soft">
                          #{booking.id.slice(-8)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-text-main">
                          {booking.guestName}
                        </p>
                        <p className="mt-1 text-ui-xs text-text-muted">
                          {booking.guestEmail}
                        </p>
                        {booking.guestMobile && (
                          <p className="mt-1 text-ui-xs text-text-muted">
                            {booking.guestMobile}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-text-main">
                          {formatDate(booking.checkIn)}
                        </p>
                        <p className="mt-1 text-ui-xs text-text-muted">
                          to {formatDate(booking.checkOut)}
                        </p>
                        <p className="mt-1 text-ui-xs text-text-muted">
                          {booking.totalNights} nights,
                          {" "}
                          {booking.guests} guests
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-text-main">
                          {modeLabels[booking.bookingMode]}
                        </p>
                        <p className="mt-1 text-ui-xs text-text-muted">
                          {booking.roomType
                            ? `${booking.roomType.name} x ${booking.rooms}`
                            : "Full property"}
                        </p>
                      </td>

                      {showVendor && (
                        <td className="px-4 py-4">
                          <p className="font-bold text-text-main">
                            {booking.property.vendor.businessName}
                          </p>
                          <p className="mt-1 text-ui-xs text-text-muted">
                            {
                              booking.property.vendor.user
                                .email
                            }
                          </p>
                        </td>
                      )}

                      <td className="px-4 py-4">
                        <p className="font-extrabold text-text-main">
                          {formatMoney(
                            booking.estimatedTotal,
                            booking.currency
                          )}
                        </p>
                        {booking.reservationAmount &&
                          Number(
                            booking.reservationAmount
                          ) > 0 && (
                            <p className="mt-1 text-ui-xs font-semibold text-amber-600">
                              Reservation:{" "}
                              {formatMoney(
                                booking.reservationAmount,
                                booking.currency
                              )}
                            </p>
                          )}
                        {booking.adminCommission &&
                          Number(booking.adminCommission) > 0 && (
                            <p className="mt-1 text-ui-xs font-semibold text-danger">
                              Admin Commission:{" "}
                              {formatMoney(
                                booking.adminCommission,
                                booking.currency
                              )}
                            </p>
                          )}
                        {booking.vendorCommission &&
                          Number(booking.vendorCommission) > 0 && (
                            <p className="mt-1 text-ui-xs font-semibold text-success">
                              Vendor Earning:{" "}
                              {formatMoney(
                                booking.vendorCommission,
                                booking.currency
                              )}
                            </p>
                          )}
                        <p className="mt-1 text-ui-xs text-text-muted">
                          Requested{" "}
                          {formatDate(booking.createdAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {(() => {
                          const totalPaid = (booking.payments || [])
                            .filter((p) => p.status === "COMPLETED")
                            .reduce(
                              (sum, p) => sum + Number(p.amount),
                              0
                            );
                          const estimatedTotal = Number(
                            booking.estimatedTotal || 0
                          );
                          const remainingBalance = Math.max(
                            0,
                            estimatedTotal - totalPaid
                          );

                          return (
                            <div className="space-y-1">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-ui-xs font-extrabold ${paymentStatusStyles[booking.paymentStatus || "PENDING"] || paymentStatusStyles.PENDING}`}
                              >
                                {paymentStatusLabels[
                                  booking.paymentStatus ||
                                    "PENDING"
                                ] || "Pending"}
                              </span>

                              <p className="text-ui-xs font-bold text-emerald-700">
                                Paid:{" "}
                                {formatMoney(
                                  totalPaid,
                                  booking.currency
                                )}
                              </p>

                              {remainingBalance > 0 ? (
                                <p className="text-ui-xs font-semibold text-amber-700">
                                  Due:{" "}
                                  {formatMoney(
                                    remainingBalance,
                                    booking.currency
                                  )}
                                </p>
                              ) : (
                                totalPaid > 0 && (
                                  <p className="text-ui-xs font-semibold text-emerald-600">
                                    Fully Paid
                                  </p>
                                )
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-ui-xs font-extrabold ${statusStyles[booking.status]}`}
                        >
                          {statusLabels[booking.status]}
                        </span>
                      </td>

                      {allowActions && (
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {booking.status ===
                              "REQUESTED" &&
                              onAccept && (
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    booking.id
                                  }
                                  onClick={() =>
                                    void onAccept(
                                      booking.id
                                    )
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-700 px-3 text-[11px] font-extrabold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionLoading ===
                                  booking.id
                                    ? "..."
                                    : "Accept"}
                                </button>
                              )}
                            {booking.status ===
                              "REQUESTED" &&
                              onReject && (
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    booking.id
                                  }
                                  onClick={() =>
                                    void onReject(
                                      booking.id
                                    )
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg bg-red-700 px-3 text-[11px] font-extrabold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionLoading ===
                                  booking.id
                                    ? "..."
                                    : "Reject"}
                                </button>
                              )}
                            {(booking.status ===
                                "CONFIRMED" ||
                              booking.status ===
                                "REQUESTED") &&
                              onPay &&
                              (!booking.paymentStatus ||
                                booking.paymentStatus ===
                                  "PENDING" ||
                                booking.paymentStatus ===
                                  "PARTIAL") && (
                                <button
                                  type="button"
                                  disabled={
                                    actionLoading ===
                                    booking.id
                                  }
                                  onClick={() =>
                                    void onPay(
                                      booking.id
                                    )
                                  }
                                  className="inline-flex h-8 items-center justify-center rounded-lg bg-brand-700 px-3 text-[11px] font-extrabold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {actionLoading ===
                                  booking.id
                                    ? "..."
                                    : "Pay"}
                                </button>
                              )}
                            {allowCashPayment &&
                               (booking.status ===
                                 "CONFIRMED" ||
                                 booking.status ===
                                   "REQUESTED") &&
                               (() => {
                                 const totalPaid = (booking.payments || [])
                                   .filter((p) => p.status === "COMPLETED")
                                   .reduce((sum, p) => sum + Number(p.amount), 0);
                                 const remaining = Math.max(0, Number(booking.estimatedTotal || 0) - totalPaid);
                                 return remaining > 0;
                               })() && (
                                 <button
                                   type="button"
                                   disabled={actionLoading === booking.id}
                                   onClick={() => {
                                     setSelectedBooking(booking);
                                     setCashAmount("");
                                     setCashTransactionId("");
                                     setCashNotes("");
                                     setCashError("");
                                     setShowCashModal(true);
                                   }}
                                   className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-700 px-3 text-[11px] font-extrabold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                 >
                                   Record Cash
                                 </button>
                               )}
                              {booking.status === "CONFIRMED" &&
                                booking.paymentStatus === "PAID" && (
                                  <button
                                    type="button"
                                    disabled={actionLoading === booking.id}
                                    onClick={async () => {
                                      try {
                                        const token = getToken();
                                        const generateRes = await api.post(
                                          `/invoices/${booking.id}/generate`
                                        );
                                        if (generateRes.data.success && generateRes.data.data?.downloadUrl) {
                                          const pdfRes = await fetch(generateRes.data.data.downloadUrl, {
                                            headers: { Authorization: `Bearer ${token}` },
                                          });
                                          const blob = await pdfRes.blob();
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement("a");
                                          a.href = url;
                                          a.download = `invoice_${booking.id}.pdf`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                        }
                                      } catch {
                                        // silently fail
                                      }
                                    }}
                                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[11px] font-extrabold text-text-main transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Invoice
                                  </button>
                                )}
                           </div>
                         </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCashModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink-900">
                  Record Cash / Offline Payment
                </h3>
                <p className="mt-1 text-xs text-ink-600">
                  Booking #{selectedBooking.id.slice(-8)} -{" "}
                  {selectedBooking.property.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCashModal(false);
                  setSelectedBooking(null);
                  setCashError("");
                }}
                className="text-ink-400 hover:text-ink-700 font-bold"
              >
                ✕
              </button>
            </div>

            {cashError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {cashError}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-amber-800 font-semibold">Estimated Total</span>
                <span className="font-extrabold text-amber-900">
                  {formatMoney(
                    selectedBooking.estimatedTotal,
                    selectedBooking.currency
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-amber-800 font-semibold">Already Paid</span>
                <span className="font-extrabold text-emerald-700">
                  {(() => {
                    const totalPaid = (selectedBooking.payments || [])
                      .filter((p) => p.status === "COMPLETED")
                      .reduce((sum, p) => sum + Number(p.amount), 0);
                    return formatMoney(totalPaid, selectedBooking.currency);
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2 border-t border-amber-200 pt-2">
                <span className="text-amber-800 font-semibold">Remaining Balance</span>
                <span className="font-extrabold text-red-700">
                  {(() => {
                    const totalPaid = (selectedBooking.payments || [])
                      .filter((p) => p.status === "COMPLETED")
                      .reduce((sum, p) => sum + Number(p.amount), 0);
                    const remaining = Math.max(0, Number(selectedBooking.estimatedTotal || 0) - totalPaid);
                    return formatMoney(remaining, selectedBooking.currency);
                  })()}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Amount Received (INR) *
                </span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-ink-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Enter amount received"
                    className="h-11 w-full rounded-lg border border-ink-200 pl-8 pr-3 text-base font-extrabold text-ink-900 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Payment Method *
                </span>
                <select
                  value={cashPaymentMethod}
                  onChange={(e) => setCashPaymentMethod(e.target.value)}
                  className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Transaction / Reference ID (Optional)
                </span>
                <input
                  type="text"
                  value={cashTransactionId}
                  onChange={(e) => setCashTransactionId(e.target.value)}
                  placeholder="e.g. UPI / Bank reference / Cash receipt"
                  className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Notes (Optional)
                </span>
                <textarea
                  rows={2}
                  value={cashNotes}
                  onChange={(e) => setCashNotes(e.target.value)}
                  placeholder="Any notes about this payment"
                  className="w-full resize-none rounded-lg border border-ink-200 px-3 py-3 text-sm text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={cashSubmitting || !cashAmount || Number(cashAmount) <= 0}
                onClick={async () => {
                  if (!selectedBooking) return;
                  setCashSubmitting(true);
                  setCashError("");

                  try {
                    await api.post(
                      `/vendor/bookings/${selectedBooking.id}/payments`,
                      {
                        amount: Number(cashAmount),
                        paymentMethod: cashPaymentMethod,
                        paymentType: "BALANCE",
                        transactionId: cashTransactionId || null,
                        notes: cashNotes || null,
                      }
                    );
                    window.location.reload();
                  } catch (err) {
                    setCashError(
                      err instanceof Error
                        ? err.message
                        : "Failed to record payment"
                    );
                  } finally {
                    setCashSubmitting(false);
                  }
                }}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 text-sm font-extrabold text-white shadow transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cashSubmitting ? "Saving..." : "Record Payment"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCashModal(false);
                  setSelectedBooking(null);
                  setCashError("");
                }}
                className="h-10 w-full rounded-xl border border-ink-200 text-xs font-bold text-ink-600 hover:bg-ink-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-ui-lg font-extrabold text-text-main">
        {value}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  apiFetch,
  ApiRequestError,
} from "@/lib/api";

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
  property: {
    id: string;
    title: string;
    city: string | null;
    state: string | null;
    category: {
      name: string;
    };
  };
  roomType: {
    id: string;
    name: string;
  } | null;
}

interface BookingsResponse {
  success: boolean;
  message: string;
  data: Booking[];
  total: number;
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
    "border-brand-200 bg-brand-50 text-brand-700",
};

const statusLabels: Record<
  BookingStatus,
  string
> = {
  REQUESTED: "Request Sent",
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
    return "Amount pending";
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return "Amount pending";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(parsed);
};

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<
    Booking[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBookings = async () => {
      const authData = localStorage.getItem(
        "farmstaygo_customer_auth"
      );

      if (!authData) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        JSON.parse(authData);
      } catch {
        localStorage.removeItem(
          "farmstaygo_customer_auth"
        );
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setLoading(true);
      setError("");

      try {
        const response =
          await apiFetch<BookingsResponse>(
            "/bookings/my"
          );

        if (!cancelled) {
          setBookings(response.data || []);
        }
      } catch (requestError) {
        if (!cancelled) {
          if (
            requestError instanceof
              ApiRequestError &&
            requestError.status === 401
          ) {
            setIsLoggedIn(false);
          }

          setError(
            requestError instanceof ApiRequestError
              ? requestError.message
              : "Unable to load bookings."
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
  }, []);

  return (
    <main className="bg-[#f7f4ed]">
      <section className="site-container py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-4 border-b border-ink-100 pb-6 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
              Trips
            </span>

            <h1 className="mt-2 text-3xl font-extrabold text-ink-900 sm:text-4xl">
              My Bookings
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
              Track the booking requests you have sent
              to farmstay hosts.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-extrabold text-white transition hover:bg-brand-800"
          >
            Book Another Stay
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-xl bg-white shadow-[0_8px_28px_rgba(27,58,39,0.08)]"
              />
            ))}
          </div>
        ) : !isLoggedIn ? (
          <section className="mt-8 rounded-2xl border border-ink-100 bg-white px-6 py-12 text-center shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
            <h2 className="text-2xl font-extrabold text-ink-900">
              Login to view your bookings
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-600">
              Your booking requests are saved with your
              customer account.
            </p>

            <Link
              href="/login?next=/bookings"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800"
            >
              Login / Signup
            </Link>
          </section>
        ) : error ? (
          <section className="mt-8 rounded-2xl border border-red-100 bg-white px-6 py-10 text-center shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
            <h2 className="text-xl font-extrabold text-ink-900">
              Unable to load bookings
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          </section>
        ) : bookings.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-ink-100 bg-white px-6 py-12 text-center shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
            <h2 className="text-2xl font-extrabold text-ink-900">
              No booking requests yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-600">
              Choose a property and send a booking request.
              It will appear here immediately.
            </p>
          </section>
        ) : (
          <div className="mt-8 grid gap-4">
            {bookings.map((booking) => {
              const location = [
                booking.property.city,
                booking.property.state,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <article
                  key={booking.id}
                  className="rounded-xl border border-ink-100 bg-white p-5 shadow-[0_8px_28px_rgba(27,58,39,0.08)]"
                >
                   <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                     <div>
                       <div className="flex flex-wrap items-center gap-2">
                         <span
                           className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${statusStyles[booking.status]}`}
                         >
                           {statusLabels[booking.status]}
                         </span>

                         <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                           {modeLabels[booking.bookingMode]}
                         </span>

                         <span
                           className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${paymentStatusStyles[booking.paymentStatus || "PENDING"] || paymentStatusStyles.PENDING}`}
                         >
                           {paymentStatusLabels[
                             booking.paymentStatus ||
                               "PENDING"
                           ] || "Pending"}
                         </span>
                       </div>

                       <h2 className="mt-3 text-xl font-extrabold text-ink-900">
                         {booking.property.title}
                       </h2>

                       <p className="mt-1 text-sm text-ink-600">
                         {booking.property.category.name}
                         {location
                           ? ` in ${location}`
                           : ""}
                       </p>

                       {booking.roomType && (
                         <p className="mt-2 text-sm font-bold text-ink-700">
                           Room: {booking.roomType.name}
                         </p>
                       )}
                     </div>

                     <div className="text-left lg:text-right">
                       <p className="text-lg font-extrabold text-ink-900">
                         {formatMoney(
                           booking.estimatedTotal,
                           booking.currency
                         )}
                       </p>

                       {booking.reservationAmount &&
                         Number(
                           booking.reservationAmount
                         ) > 0 && (
                           <p className="mt-1 text-sm font-semibold text-amber-700">
                             Reservation:{" "}
                             {formatMoney(
                               booking.reservationAmount,
                               booking.currency
                             )}
                           </p>
                         )}

                       <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                         Request #{booking.id.slice(-8)}
                       </p>
                     </div>
                   </div>

                    <div className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
                      {(booking.status ===
                          "CONFIRMED" ||
                        booking.status ===
                          "REQUESTED") &&
                        (!booking.paymentStatus ||
                          booking.paymentStatus ===
                            "PENDING" ||
                          booking.paymentStatus ===
                            "PARTIAL") && (
                          <button
                            type="button"
                            onClick={() => {
                              window.location.href = `/bookings/${booking.id}/pay`;
                            }}
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-extrabold text-white transition hover:bg-brand-800"
                          >
                            Pay Now
                          </button>
                        )}

                      {booking.status === "CONFIRMED" &&
                        booking.paymentStatus === "PAID" && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response =
                                  await apiFetch<{
                                    success: boolean;
                                    data: { downloadUrl: string };
                                  }>(
                                    `/invoices/${booking.id}/generate`,
                                    { method: "POST" }
                                  );
                                if (
                                  response.success &&
                                  response.data?.downloadUrl
                                ) {
                                  const authData = localStorage.getItem("farmstaygo_customer_auth");
                                  const token = authData ? JSON.parse(authData).data?.token : "";
                                  const pdfRes = await fetch(response.data.downloadUrl, {
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
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
                          >
                            Download Invoice
                          </button>
                        )}

                      <span className="text-xs text-ink-500">
                        Requested{" "}
                        {formatDate(booking.createdAt)}
                      </span>
                    </div>

                  <div className="mt-5 grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
                        Check-in
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-ink-800">
                        {formatDate(booking.checkIn)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
                        Check-out
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-ink-800">
                        {formatDate(booking.checkOut)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
                        Guests
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-ink-800">
                        {booking.guests}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
                        Nights
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-ink-800">
                        {booking.totalNights}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

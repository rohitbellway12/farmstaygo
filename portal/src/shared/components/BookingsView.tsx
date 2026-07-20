import axios from "axios";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
}: BookingsViewProps) {
  const [bookings, setBookings] = useState<
    Booking[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                    Status
                  </th>
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
                        <p className="mt-1 text-ui-xs text-text-muted">
                          Requested{" "}
                          {formatDate(booking.createdAt)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-ui-xs font-extrabold ${statusStyles[booking.status]}`}
                        >
                          {statusLabels[booking.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

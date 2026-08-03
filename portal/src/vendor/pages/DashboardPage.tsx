import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import api from "../../shared/api/api";

interface DashboardStats {
  vendor: {
    id: number;
    businessName: string;
    totalEarnings: number;
    totalCommission: number;
  };
  propertyStats: { total: number; active: number };
  bookingStats: { total: number; pending: number; confirmed: number; completed: number; cancelled: number };
  revenueStats: { total: number; commission: number; paid: number; pendingPayout: number; paidPayout: number; occupancyRate: number };
  paymentStats: { total: number; totalPaid: number };
  recentBookings: Array<{
    id: string;
    status: string;
    checkIn: string;
    checkOut: string;
    estimatedTotal: string | number | null;
    guestName: string;
    property: { title: string; city: string | null; state: string | null };
  }>;
  recentPayouts: Array<{
    id: string;
    bookingAmount: string;
    commissionAmount: string;
    vendorEarning: string;
    status: string;
    paidAt: string | null;
    booking: { id: string; guestName: string; property: { title: string } };
  }>;
  propertyPerformance: Array<{
    id: string;
    title: string;
    city: string | null;
    state: string | null;
    status: string;
    bookings: number;
  }>;
}

interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardStats;
}

const statusStyles: Record<string, string> = {
  REQUESTED: "border-amber-200 bg-amber-50 text-amber-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-700",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  COMPLETED: "border-blue-200 bg-blue-50 text-blue-700",
};

const statusLabels: Record<string, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
};

const formatMoney = (value: number | null, currency = "INR"): string => {
  if (value === null || value === undefined) return "₹0";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
};

const formatNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  return fallbackMessage;
};

function IconProperties() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" />
    </svg>
  );
}

function IconBookings() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M3 10h18" /><circle cx="16" cy="16" r="3" />
    </svg>
  );
}

function IconRevenue() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M8 15h4" />
    </svg>
  );
}

function IconPayout() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16" cy="15" r="2" />
    </svg>
  );
}

function IconOccupancy() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a9 9 0 1 0 9 9h-9Z" /><path d="M15 3.5A8.5 8.5 0 0 1 20.5 9H15Z" />
    </svg>
  );
}

function IconEarnings() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconArrowUp() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function LoadingCards() {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-dashboard-card border border-border bg-surface shadow-dashboard-card" />
      ))}
    </>
  );
}

function StatCard({ title, value, change, iconClass, icon, linkLabel, linkTo }: { title: string; value: string; change: string; iconClass: string; icon: React.ReactNode; linkLabel?: string; linkTo?: string }) {
  return (
    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card hover:shadow-dashboard-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{title}</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{value}</strong>
          {linkLabel && linkTo ? (
            <Link to={linkTo} className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-900">{change}</Link>
          ) : (
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-success"><IconArrowUp />{change}</span>
          )}
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconClass}`}>{icon}</span>
      </div>
    </section>
  );
}

function DonutChart({ segments, size = 100 }: { segments: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        {segments.map((segment, index) => {
          const fraction = segment.value / total;
          const dashArray = fraction * circumference;
          const dashOffset = -offset * circumference;
          offset += fraction;
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="7"
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-base font-extrabold text-text-main">{formatNumber(total)}</strong>
        <span className="text-[10px] text-text-muted">Total</span>
      </div>
    </div>
  );
}

export default function VendorDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<DashboardResponse>("/vendor/dashboard/stats");
      setStats(response.data.data);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load dashboard stats."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div className="space-y-4">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <LoadingCards />
        </section>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="rounded-dashboard-card border border-red-100 bg-surface p-5 text-sm font-bold text-red-600 shadow-dashboard-card">
        {pageError}
        <button type="button" onClick={() => void loadStats()} className="ml-4 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-dashboard-card border border-border bg-surface p-8 text-center shadow-dashboard-card">
        <h2 className="text-lg font-extrabold text-text-main">No data available</h2>
        <p className="mt-2 text-sm text-text-muted">Dashboard data will appear once you start using the platform.</p>
      </div>
    );
  }

  const bookingDonutSegments = [
    { label: "Requested", value: stats.bookingStats.pending, color: "var(--color-amber-500)" },
    { label: "Confirmed", value: stats.bookingStats.confirmed, color: "var(--color-emerald-500)" },
    { label: "Completed", value: stats.bookingStats.completed, color: "var(--color-blue-500)" },
    { label: "Cancelled", value: stats.bookingStats.cancelled, color: "var(--color-slate-400)" },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Properties" value={formatNumber(stats.propertyStats.total)} change={`${stats.propertyStats.active} active`} iconClass="bg-success-soft text-success" icon={<IconProperties />} linkLabel="Manage" linkTo="/vendor/properties" />
        <StatCard title="Bookings" value={formatNumber(stats.bookingStats.total)} change={`${stats.bookingStats.completed} completed`} iconClass="bg-info-soft text-info" icon={<IconBookings />} linkLabel="View" linkTo="/vendor/bookings" />
        <StatCard title="Revenue" value={formatMoney(stats.revenueStats.total)} change={`${stats.paymentStats.total} payments`} iconClass="bg-primary-50 text-primary-700" icon={<IconRevenue />} />
        <StatCard title="Available Payout" value={formatMoney(stats.revenueStats.pendingPayout)} change={`Paid: ${formatMoney(stats.revenueStats.paidPayout)}`} iconClass="bg-chart-orange-soft text-chart-orange" icon={<IconPayout />} linkLabel="Payouts" linkTo="/vendor/payouts" />
        <StatCard title="Occupancy" value={`${stats.revenueStats.occupancyRate}%`} change={`${stats.bookingStats.completed} completed`} iconClass="bg-purple-soft text-purple" icon={<IconOccupancy />} />
        <StatCard title="Your Earnings" value={formatMoney(stats.vendor.totalEarnings)} change={`Commission: ${formatMoney(stats.revenueStats.commission)}`} iconClass="bg-success-soft text-success" icon={<IconEarnings />} linkLabel="Details" linkTo="/vendor/earnings" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-text-main">Bookings</h3>
            <span className="text-xs text-text-muted">{stats.bookingStats.total} total</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutChart segments={bookingDonutSegments} size={90} />
            <div className="space-y-1.5">
              {bookingDonutSegments.map((segment) => (
                <div key={segment.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-text-muted">{segment.label}</span>
                  <strong className="ml-auto text-text-main">{segment.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Revenue Breakdown</h3>
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Total Revenue</span>
                <strong className="text-text-main">{formatMoney(stats.revenueStats.total)}</strong>
              </div>
              <div className="h-2 rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-chart-green" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Your Earnings</span>
                <strong className="text-success">{formatMoney(stats.vendor.totalEarnings)}</strong>
              </div>
              <div className="h-2 rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-success" style={{ width: `${stats.revenueStats.total > 0 ? (stats.vendor.totalEarnings / stats.revenueStats.total) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Platform Commission</span>
                <strong className="text-danger">{formatMoney(stats.revenueStats.commission)}</strong>
              </div>
              <div className="h-2 rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-danger" style={{ width: `${stats.revenueStats.total > 0 ? (stats.revenueStats.commission / stats.revenueStats.total) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Payout Status</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Pending Payout</span>
              <strong className="text-sm font-extrabold text-warning">{formatMoney(stats.revenueStats.pendingPayout)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Paid This Month</span>
              <strong className="text-sm font-extrabold text-success">{formatMoney(stats.revenueStats.paidPayout)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Total Payments</span>
              <strong className="text-sm font-extrabold text-text-main">{stats.paymentStats.total}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Occupancy Rate</span>
              <strong className="text-sm font-extrabold text-purple">{stats.revenueStats.occupancyRate}%</strong>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/vendor/payouts" className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-primary-700 px-4 text-xs font-bold text-white transition hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-600/20">
              View All Payouts
            </Link>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Top Properties</h3>
          {stats.propertyPerformance.length === 0 ? (
            <div className="mt-4 text-center text-sm text-text-muted">No properties yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {stats.propertyPerformance.map((prop, index) => (
                <div key={prop.id} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? "bg-warning-soft text-warning" : index === 1 ? "bg-surface-muted text-text-secondary" : "bg-surface-muted text-text-muted"}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-extrabold text-text-main">{prop.title}</strong>
                    <span className="block truncate text-[10px] text-text-muted">{[prop.city, prop.state].filter(Boolean).join(", ")}</span>
                  </div>
                  <span className="text-xs font-bold text-text-main">{prop.bookings}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Recent Bookings</h3>
          {stats.recentBookings.length === 0 ? (
            <div className="mt-4 text-center text-sm text-text-muted">No bookings yet.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {stats.recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-3 transition hover:bg-surface-muted">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold shrink-0 ${statusStyles[booking.status] || statusStyles.REQUESTED}`}>
                    {statusLabels[booking.status] || booking.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-extrabold text-text-main">{booking.guestName}</strong>
                    <span className="block truncate text-[10px] text-text-muted">{booking.property.title}</span>
                  </div>
                  <strong className="text-xs font-extrabold text-text-main shrink-0">{formatMoney(Number(booking.estimatedTotal))}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center">
            <Link to="/vendor/bookings" className="text-xs font-extrabold text-primary-700 hover:text-primary-900">View all bookings →</Link>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Recent Payouts</h3>
          {stats.recentPayouts.length === 0 ? (
            <div className="mt-4 text-center text-sm text-text-muted">No payout records yet.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {stats.recentPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-3 transition hover:bg-surface-muted">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold shrink-0 ${payout.status === "PAID" ? "border-success/20 bg-success-soft text-success" : "border-warning/20 bg-warning-soft text-warning"}`}>
                    {payout.status === "PAID" ? "Paid" : "Pending"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-extrabold text-text-main">{payout.booking.guestName}</strong>
                    <span className="block truncate text-[10px] text-text-muted">{payout.booking.property.title}</span>
                  </div>
                  <strong className="text-xs font-extrabold text-success shrink-0">{formatMoney(Number(payout.vendorEarning))}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center">
            <Link to="/vendor/payouts" className="text-xs font-extrabold text-primary-700 hover:text-primary-900">View all payouts →</Link>
          </div>
        </section>
      </section>

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <h3 className="text-sm font-extrabold text-text-main">Quick Links</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Link to="/vendor/properties" className="flex flex-col items-center gap-2 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-success-soft text-success"><IconProperties /></span>
            <span className="text-xs font-extrabold text-text-main">Properties</span>
          </Link>
          <Link to="/vendor/bookings" className="flex flex-col items-center gap-2 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-info-soft text-info"><IconBookings /></span>
            <span className="text-xs font-extrabold text-text-main">Bookings</span>
          </Link>
          <Link to="/vendor/earnings" className="flex flex-col items-center gap-2 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-50 text-primary-700"><IconRevenue /></span>
            <span className="text-xs font-extrabold text-text-main">Earnings</span>
          </Link>
          <Link to="/vendor/payouts" className="flex flex-col items-center gap-2 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-chart-orange-soft text-chart-orange"><IconPayout /></span>
            <span className="text-xs font-extrabold text-text-main">Payouts</span>
          </Link>
          <Link to="/vendor/calendar" className="flex flex-col items-center gap-2 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-soft text-purple">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            </span>
            <span className="text-xs font-extrabold text-text-main">Calendar</span>
          </Link>
          <Link to="/vendor/settings" className="flex flex-col items-center gap-2 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-muted text-text-muted">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
            </span>
            <span className="text-xs font-extrabold text-text-main">Settings</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
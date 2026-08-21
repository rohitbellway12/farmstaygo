import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import api from "../../shared/api/api";

interface DashboardStats {
  totalUsers: number;
  totalVendors: number;
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  vendorStats: { pending: number; approved: number; rejected: number };
  propertyStats: { total: number; pending: number; approved: number };
  bookingStats: { total: number; pending: number; confirmed: number; completed: number; cancelled: number; rejected: number };
  paymentStats: { total: number; totalPaid: number; totalPending: number };
  payoutStats: { total: number; totalPaid: number; pending: number };
  monthlyRevenue: number[];
  monthlyBookings: number[];
  recentBookings: Array<{
    id: string;
    status: string;
    checkIn: string;
    checkOut: string;
    estimatedTotal: string | number | null;
    guestName: string;
    property: { title: string; city: string | null; state: string | null };
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

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconVendors() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

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

function IconCommission() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8" cy="8" r="3" /><circle cx="16" cy="16" r="3" /><path d="m18 6-12 12" />
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

function MiniBarChart({ data, color = "bg-chart-green" }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-8">
      {data.map((value, index) => (
        <div
          key={index}
          className={`flex-1 rounded-sm ${color} transition-all`}
          style={{ height: `${Math.max((value / max) * 100, 8)}%`, opacity: index % 3 === 0 ? 1 : 0.7 }}
        />
      ))}
    </div>
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

function StatCard({ title, value, change, iconClass, icon, trend }: { title: string; value: string; change: string; iconClass: string; icon: React.ReactNode; trend?: "up" | "down" | "neutral" }) {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-text-muted";
  const trendIcon = trend === "up" ? <IconArrowUp /> : trend === "down" ? <IconArrowUp /> : null;

  return (
    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card hover:shadow-dashboard-card-hover transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{title}</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{value}</strong>
          <span className={`mt-1.5 inline-flex items-center gap-1 text-xs font-bold ${trendColor}`}>
            {trendIcon}
            {change}
          </span>
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconClass}`}>{icon}</span>
      </div>
    </section>
  );
}

function DonutChart({ segments, size = 120 }: { segments: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xs text-text-muted">No data</span>
      </div>
    );
  }

  const radius = size / 2 - 8;
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
              strokeWidth="8"
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-lg font-extrabold text-text-main">{formatNumber(total)}</strong>
        <span className="text-xs text-text-muted">Total</span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<DashboardResponse>("/admin/dashboard/stats");
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
    { label: "Rejected", value: stats.bookingStats.rejected, color: "var(--color-red-500)" },
  ];

  const vendorDonutSegments = [
    { label: "Approved", value: stats.vendorStats.approved, color: "var(--color-emerald-500)" },
    { label: "Pending", value: stats.vendorStats.pending, color: "var(--color-amber-500)" },
    { label: "Rejected", value: stats.vendorStats.rejected, color: "var(--color-red-500)" },
  ];

  const propertyDonutSegments = [
    { label: "Approved", value: stats.propertyStats.approved, color: "var(--color-emerald-500)" },
    { label: "Pending", value: stats.propertyStats.pending, color: "var(--color-amber-500)" },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Users" value={formatNumber(stats.totalUsers)} change="All registered users" iconClass="bg-success-soft text-success" icon={<IconUsers />} trend="up" />
        <StatCard title="Total Vendors" value={formatNumber(stats.totalVendors)} change={`${stats.vendorStats.approved} approved`} iconClass="bg-info-soft text-info" icon={<IconVendors />} trend="up" />
        <StatCard title="Total Properties" value={formatNumber(stats.totalProperties)} change={`${stats.propertyStats.approved} approved`} iconClass="bg-warning-soft text-warning" icon={<IconProperties />} trend="up" />
        <StatCard title="Total Bookings" value={formatNumber(stats.totalBookings)} change={`${stats.bookingStats.completed} completed`} iconClass="bg-chart-red-soft text-chart-red" icon={<IconBookings />} trend="up" />
        <StatCard title="Platform Revenue" value={formatMoney(stats.totalRevenue)} change={`${stats.paymentStats.total} payments`} iconClass="bg-purple-soft text-purple" icon={<IconRevenue />} trend="up" />
        <StatCard title="Commission Earned" value={formatMoney(stats.totalCommission)} change={`${stats.payoutStats.pending} pending`} iconClass="bg-danger-soft text-danger" icon={<IconCommission />} trend="up" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-text-main">Booking Status</h3>
            <span className="text-xs text-text-muted">{stats.bookingStats.total} total</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutChart segments={bookingDonutSegments} size={100} />
            <div className="space-y-2">
              {bookingDonutSegments.map((segment) => (
                <div key={segment.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-text-muted">{segment.label}</span>
                  <strong className="ml-auto text-text-main">{segment.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-text-main">Vendor KYC</h3>
            <span className="text-xs text-text-muted">{stats.vendorStats.pending + stats.vendorStats.approved + stats.vendorStats.rejected} total</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutChart segments={vendorDonutSegments} size={100} />
            <div className="space-y-2">
              {vendorDonutSegments.map((segment) => (
                <div key={segment.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-text-muted">{segment.label}</span>
                  <strong className="ml-auto text-text-main">{segment.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-text-main">Property Status</h3>
            <span className="text-xs text-text-muted">{stats.propertyStats.total} total</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <DonutChart segments={propertyDonutSegments} size={100} />
            <div className="space-y-2">
              {propertyDonutSegments.map((segment) => (
                <div key={segment.label} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-text-muted">{segment.label}</span>
                  <strong className="ml-auto text-text-main">{segment.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Revenue Trend</h3>
          <div className="mt-4">
            <MiniBarChart data={stats.monthlyRevenue} color="bg-chart-green" />
          </div>
          <div className="mt-3 flex justify-between text-xs text-text-muted">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
        </section>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Quick Actions</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/admin/vendors" className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-info-soft text-info"><IconVendors /></span>
              <div>
                <strong className="block text-sm font-extrabold text-text-main">Manage Vendors</strong>
                <span className="text-xs text-text-muted">{stats.vendorStats.pending} pending approval</span>
              </div>
            </Link>
            <Link to="/admin/property-approvals" className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-warning-soft text-warning"><IconProperties /></span>
              <div>
                <strong className="block text-sm font-extrabold text-text-main">Property Approvals</strong>
                <span className="text-xs text-text-muted">{stats.propertyStats.pending} pending</span>
              </div>
            </Link>
            <Link to="/admin/commissions" className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-danger-soft text-danger"><IconCommission /></span>
              <div>
                <strong className="block text-sm font-extrabold text-text-main">Commissions</strong>
                <span className="text-xs text-text-muted">{stats.payoutStats.pending} pending</span>
              </div>
            </Link>
            <Link to="/admin/payments" className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-4 transition hover:bg-surface-muted">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-success-soft text-success"><IconRevenue /></span>
              <div>
                <strong className="block text-sm font-extrabold text-text-main">Payments</strong>
                <span className="text-xs text-text-muted">{stats.paymentStats.totalPaid} paid</span>
              </div>
            </Link>
          </div>
        </section>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <h3 className="text-sm font-extrabold text-text-main">Recent Bookings</h3>
          {stats.recentBookings.length === 0 ? (
            <div className="mt-4 text-center text-sm text-text-muted">No bookings yet.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {stats.recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-3 transition hover:bg-surface-muted">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusStyles[booking.status] || statusStyles.REQUESTED}`}>
                    {statusLabels[booking.status] || booking.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-extrabold text-text-main">{booking.guestName}</strong>
                    <span className="block truncate text-xs text-text-muted">{booking.property.title}</span>
                  </div>
                  <strong className="text-sm font-extrabold text-text-main">{formatMoney(Number(booking.estimatedTotal))}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center">
            <Link to="/admin/bookings" className="text-xs font-extrabold text-primary-700 hover:text-primary-900">View all bookings →</Link>
          </div>
        </section>
      </section>

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-text-main">Booking Overview</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-green" />Bookings</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-chart-blue" />Revenue (₹)</span>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-[2px] h-32">
          {stats.monthlyBookings.map((bookingCount, index) => {
            const maxBookings = Math.max(...stats.monthlyBookings, 1);
            const maxRevenue = Math.max(...stats.monthlyRevenue, 1);
            const bookingHeight = Math.max((bookingCount / maxBookings) * 100, 4);
            const revenueHeight = Math.max((stats.monthlyRevenue[index] / maxRevenue) * 100, 4);
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-[2px] justify-end h-full">
                <div className="w-full rounded-t-sm bg-chart-blue/50 transition hover:bg-chart-blue" style={{ height: `${revenueHeight}%` }} />
                <div className="w-full rounded-t-sm bg-chart-green/60 transition hover:bg-chart-green" style={{ height: `${bookingHeight}%` }} />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-text-muted">
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
        </div>
      </section>
    </div>
  );
}
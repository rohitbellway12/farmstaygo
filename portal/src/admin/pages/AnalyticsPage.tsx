import axios from "axios";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../../shared/api/api";

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  totalVendors: number;
  totalProperties: number;
  completedBookings: number;
  cancelledBookings: number;
  rejectedBookings: number;
  confirmedBookings: number;
  requestedBookings: number;
  averageBookingValue: number;
  occupancyRate: number;
  monthlyLabels: string[];
  monthlyRevenue: number[];
  monthlyBookings: number[];
  topVendors: Array<{
    id: string;
    businessName: string;
    bookings: number;
    revenue: number;
  }>;
  categoryBreakdown: Array<{
    label: string;
    value: number;
    color: string;
  }>;
}

interface AnalyticsResponse {
  success: boolean;
  message: string;
  data: AnalyticsData;
}

interface ChartDataPoint {
  month: string;
  revenue: number;
  bookings: number;
}

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

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-dashboard-card border border-border bg-surface shadow-dashboard-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-dashboard-card border border-border bg-surface shadow-dashboard-card" />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const response = await api.get<AnalyticsResponse>(`/admin/analytics${params.toString() ? `?${params.toString()}` : ""}`);
      setData(response.data.data);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load analytics."));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (pageError) {
    return (
      <div className="rounded-dashboard-card border border-red-100 bg-surface p-5 text-sm font-bold text-red-600 shadow-dashboard-card">
        {pageError}
        <button type="button" onClick={() => void loadAnalytics()} className="ml-4 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-dashboard-card border border-border bg-surface p-8 text-center shadow-dashboard-card">
        <h2 className="text-lg font-extrabold text-text-main">No analytics data available</h2>
        <p className="mt-2 text-sm text-text-muted">Analytics will appear once there is sufficient data.</p>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.monthlyLabels.map((label, index) => ({
    month: label,
    revenue: data.monthlyRevenue[index] ?? 0,
    bookings: data.monthlyBookings[index] ?? 0,
  }));

  const hasChartData = chartData.some((d) => d.revenue > 0 || d.bookings > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-control border border-border bg-surface p-3 shadow-dashboard-card">
          <p className="text-xs font-semibold text-text-main">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.name === "Revenue" ? formatMoney(entry.value) : formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Avg Booking Value</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatMoney(data.averageBookingValue)}</strong>
        </section>
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Occupancy Rate</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{data.occupancyRate}%</strong>
        </section>
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Revenue</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatMoney(data.totalRevenue)}</strong>
        </section>
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Total Bookings</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatNumber(data.totalBookings)}</strong>
        </section>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Confirmed</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatNumber(data.confirmedBookings)}</strong>
        </section>
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Completed</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatNumber(data.completedBookings)}</strong>
        </section>
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Cancelled</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatNumber(data.cancelledBookings)}</strong>
        </section>
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Rejected</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatNumber(data.rejectedBookings)}</strong>
        </section>
        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Requested</span>
          <strong className="mt-1.5 block text-2xl font-extrabold leading-none text-text-main">{formatNumber(data.requestedBookings)}</strong>
        </section>
      </section>

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-extrabold text-text-main">Revenue &amp; Bookings Trend</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-control border border-border bg-surface-soft px-3 py-1.5">
              <IconCalendar />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs text-text-main outline-none"
                title="From date"
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs text-text-main outline-none"
                title="To date"
              />
              <button
                type="button"
                onClick={() => void loadAnalytics()}
                className="ml-1 rounded-control bg-primary-700 px-3 py-1 text-xs font-bold text-white hover:bg-primary-800"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {hasChartData ? (
          <div className="mt-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7ece9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#748179" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e7ece9" }}
                  label={{ value: "Month", position: "insideBottom", offset: -5, style: { fontSize: 11, fill: "#748179" } }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#748179" }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Revenue (₹)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#748179" }, offset: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#748179" }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Bookings", angle: 90, position: "insideRight", style: { fontSize: 11, fill: "#748179" }, offset: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#179c62" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="bookings" name="Bookings" fill="#2f80ed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 flex h-64 items-center justify-center rounded-control border border-border bg-surface-soft">
            <div className="text-center">
              <p className="text-sm font-semibold text-text-main">No trend data available</p>
              <p className="mt-1 text-xs text-text-muted">Booking data will appear once bookings are created.</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <h3 className="text-sm font-extrabold text-text-main">Top Vendors by Revenue</h3>
        {data.topVendors.length === 0 ? (
          <div className="mt-4 text-center text-sm text-text-muted">No vendor data available.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-3 transition hover:bg-surface-muted">
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-extrabold text-text-main">{vendor.businessName}</strong>
                  <span className="block truncate text-xs text-text-muted">{vendor.bookings} bookings</span>
                </div>
                <strong className="text-sm font-extrabold text-text-main">{formatMoney(vendor.revenue)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <h3 className="text-sm font-extrabold text-text-main">Revenue by Category</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.categoryBreakdown.map((category) => (
            <div key={category.label} className="flex items-center gap-3 rounded-control border border-border bg-surface-soft p-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-text-main">{category.label}</span>
              </div>
              <strong className="text-sm font-extrabold text-text-main">{formatMoney(category.value)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../../shared/api/api";

interface EarningsData {
  totalEarnings: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  totalBookings: number;
  completedBookings: number;
  totalBookingsRevenue: number;
}

interface EarningsResponse {
  success: boolean;
  message: string;
  data: EarningsData;
}

const formatMoney = (value: number, currency = "INR"): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  return fallbackMessage;
};

function TrendingUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export default function VendorEarningsPage() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadEarnings = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<EarningsResponse>("/vendor/earnings");
      setEarnings(response.data.data);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load earnings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadEarnings(); }, [loadEarnings]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-dashboard-card border border-border bg-surface shadow-dashboard-card" />
          ))}
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="rounded-dashboard-card border border-red-100 bg-surface p-5 text-ui-sm font-bold text-red-600 shadow-dashboard-card">
        {pageError}
        <button type="button" onClick={() => void loadEarnings()} className="ml-4 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }

  if (!earnings) {
    return (
      <div className="rounded-dashboard-card border border-border bg-surface p-8 text-center shadow-dashboard-card">
        <h2 className="text-ui-lg font-extrabold text-text-main">No earnings data yet</h2>
        <p className="mt-2 text-ui-sm text-text-muted">Earnings will appear once you start receiving bookings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-success-soft text-success"><TrendingUpIcon /></span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">Earnings</h1>
            <p className="mt-1 text-sm text-text-muted">Your revenue and commission breakdown.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Total Earnings</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-success">{formatMoney(earnings.totalEarnings)}</strong>
          <span className="mt-2 block text-xs text-text-muted">After platform commission</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Platform Commission</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-danger">{formatMoney(earnings.totalCommission)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Deducted by platform</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Pending Commission</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-warning">{formatMoney(earnings.pendingCommission)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Awaiting payout</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Paid Commission</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">{formatMoney(earnings.paidCommission)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Already settled</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Total Bookings</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">{earnings.totalBookings}</strong>
          <span className="mt-2 block text-xs text-text-muted">All time</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Completed Bookings</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-success">{earnings.completedBookings}</strong>
          <span className="mt-2 block text-xs text-text-muted">Successfully finished</span>
        </div>
        <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <span className="text-sm font-semibold text-text-muted">Total Revenue</span>
          <strong className="mt-2 block text-2xl font-extrabold leading-none text-text-main">{formatMoney(earnings.totalBookingsRevenue)}</strong>
          <span className="mt-2 block text-xs text-text-muted">Gross booking value</span>
        </div>
      </section>
    </div>
  );
}

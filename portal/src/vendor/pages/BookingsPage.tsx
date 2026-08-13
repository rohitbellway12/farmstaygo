import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import BookingsView from "../../shared/components/BookingsView";

import api from "../../shared/api/api";

export default function VendorBookingsPage() {
  const [enabledPaymentMethods, setEnabledPaymentMethods] =
    useState<string[]>(["ONLINE"]);

  const [actionMessage, setActionMessage] =
    useState<string>("");

  const [refreshTrigger, setRefreshTrigger] =
    useState(0);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            paymentMethods: string[];
          };
        }>("/public/settings/payment-methods");

        if (res.data.success && res.data.data.paymentMethods.length > 0) {
          setEnabledPaymentMethods(res.data.data.paymentMethods);
        }
      } catch {
        // keep defaults
      }
    };

    void loadPaymentMethods();
  }, []);

  const allowCashPayment = enabledPaymentMethods.some(
    (method) => method === "CASH" || method === "BANK_TRANSFER"
  );

  const handleAccept = async (
    bookingId: string
  ): Promise<void> => {
    await api.post(
      `/vendor/bookings/${bookingId}/accept`
    );

    setActionMessage(
      `Booking #${bookingId.slice(-8)} accepted successfully.`
    );

    setRefreshTrigger((prev) => prev + 1);

    setTimeout(() => setActionMessage(""), 3000);
  };

  const handleReject = async (
    bookingId: string
  ): Promise<void> => {
    const reason = prompt(
      "Reason for rejection (optional):"
    );

    await api.post(
      `/vendor/bookings/${bookingId}/reject`,
      { reason: reason || null }
    );

    setActionMessage(
      `Booking #${bookingId.slice(-8)} rejected successfully.`
    );

    setRefreshTrigger((prev) => prev + 1);

    setTimeout(() => setActionMessage(""), 3000);
  };

  const handleBookingUpdated = (
    _bookingId: string,
    updates: { status?: string }
  ): void => {
    if (updates.status === "CONFIRMED") {
      setActionMessage("Booking accepted successfully.");
    } else if (updates.status === "REJECTED") {
      setActionMessage("Booking rejected successfully.");
    }

    setTimeout(() => setActionMessage(""), 3000);
  };

  const handlePay = async (
    bookingId: string
  ): Promise<void> => {
    window.location.href = `/vendor/bookings/${bookingId}/pay`;
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">Bookings</h1>
            <p className="mt-1 text-sm text-text-muted">Manage booking requests received for your properties.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/vendor/earnings" className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-success/30 bg-success-soft px-5 text-sm font-bold text-success transition hover:bg-success/10">
            View Earnings
          </Link>
          <Link to="/vendor/payouts" className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-primary-300 bg-primary-50 px-5 text-sm font-bold text-primary-700 transition hover:bg-primary-100">
            View Payouts
          </Link>
        </div>
      </section>
      {actionMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {actionMessage}
        </div>
      )}
      <BookingsView
        endpoint="/vendor/bookings"
        title=""
        description=""
        showVendor={false}
        allowActions
        allowCashPayment={allowCashPayment}
        enabledPaymentMethods={enabledPaymentMethods}
        onAccept={handleAccept}
        onReject={handleReject}
        onPay={handlePay}
        onBookingUpdated={handleBookingUpdated}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}

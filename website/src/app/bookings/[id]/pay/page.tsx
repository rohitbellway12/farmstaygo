"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  apiFetch,
  ApiRequestError,
} from "@/lib/api";

type PaymentMethod = "ONLINE" | "CASH" | "BANK_TRANSFER";
type PaymentType = "RESERVATION" | "INSTALLMENT" | "BALANCE" | "REFUND";

interface PaymentSummary {
  totalPaid: number;
  totalRefunded: number;
  estimatedTotal: number | null;
  balance: number | null;
  reservationAmount: number | null;
  paymentStatus: string | null;
}

interface Booking {
  id: string;
  status: string;
  estimatedTotal: string | number | null;
  reservationAmount: string | number | null;
  currency: string;
  paymentStatus: string | null;
  property: {
    id: string;
    title: string;
  };
}

interface RazorpayOrderResponse {
  success: boolean;
  sandbox: boolean;
  message?: string;
  data: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

const paymentStatusStyles: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  PENDING_APPROVAL: "border-orange-200 bg-orange-50 text-orange-700",
  PARTIAL: "border-blue-200 bg-blue-50 text-blue-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REFUNDED: "border-slate-200 bg-slate-100 text-slate-700",
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: "Payment pending",
  PENDING_APPROVAL: "Pending vendor approval",
  PARTIAL: "Partial paid",
  PAID: "Paid",
  REFUNDED: "Paid in full",
};

export default function BookingPaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = String(params.id || "").trim();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<Array<{
    id: string;
    amount: string | number;
    paymentMethod: string;
    paymentType: string;
    status: string;
    transactionId: string | null;
    notes: string | null;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");
  const [paymentType, setPaymentType] = useState<PaymentType>("RESERVATION");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");

  const [enabledPaymentMethods, setEnabledPaymentMethods] =
    useState<string[]>(["ONLINE"]);

  const [bankDetails, setBankDetails] = useState<{
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfscCode: string;
  } | null>(null);

  // Sandbox Modal state
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxOrderDetails, setSandboxOrderDetails] = useState<{
    orderId: string;
    amount: number;
    currency: string;
  } | null>(null);

  // Load Razorpay script dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const loadData = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      setError("");

      const [bookingRes, paymentsRes] = await Promise.all([
        apiFetch<{ success: boolean; data: Booking[] }>(`/bookings/my`),
        apiFetch<{
          success: boolean;
          summary: PaymentSummary;
          data: Array<{
            id: string;
            amount: string | number;
            paymentMethod: string;
            paymentType: string;
            status: string;
            transactionId: string | null;
            notes: string | null;
            createdAt: string;
          }>;
        }>(`/bookings/${bookingId}/payments`),
      ]);

      const found = (bookingRes.data || []).find((b) => b.id === bookingId);

      if (!found) {
        setError("Booking not found");
        return;
      }

      setBooking(found);
      const sum = paymentsRes.summary;
      setSummary(sum);
      setPayments(paymentsRes.data || []);

      // Auto-populate recommended deposit or balance amount if empty
      const reqDeposit = sum.reservationAmount ? Number(sum.reservationAmount) : 0;
      const currentPaid = sum.totalPaid || 0;
      if (currentPaid < reqDeposit && reqDeposit > 0) {
        setAmount(String(reqDeposit - currentPaid));
      } else if (sum.balance && sum.balance > 0) {
        setAmount(String(sum.balance));
      }
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : "Unable to load booking payment details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [bookingId]);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const res = await apiFetch<{
          success: boolean;
          data: {
            paymentMethods: string[];
          };
        }>("/public/settings/payment-methods");

        if (res.success && res.data.paymentMethods.length > 0) {
          setEnabledPaymentMethods(res.data.paymentMethods);
          if (!res.data.paymentMethods.includes(paymentMethod)) {
            setPaymentMethod(res.data.paymentMethods[0] as PaymentMethod);
          }
        }
      } catch {
        // keep defaults
      }
    };

    void loadPaymentMethods();
  }, []);

  useEffect(() => {
    const loadBankDetails = async () => {
      try {
        const bankRes = await apiFetch<{
          success: boolean;
          data: {
            bankAccountName: string;
            bankAccountNumber: string;
            bankIfscCode: string;
          };
        }>(`/public/settings/vendor-bank-details?propertyId=${booking?.property?.id || ""}`);

        if (bankRes.success) {
          setBankDetails(bankRes.data);
        }
      } catch {
        // keep defaults
      }
    };

    if (booking?.property?.id) {
      void loadBankDetails();
    }
  }, [booking?.property?.id]);

  // Handle Online Razorpay Payment flow
  const handleRazorpayCheckout = async (payAmount: number) => {
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const res = await apiFetch<RazorpayOrderResponse>(
        `/bookings/${bookingId}/razorpay/order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: payAmount }),
        }
      );

      if (res.sandbox) {
        // Show interactive sandbox mock modal
        setSandboxOrderDetails(res.data);
        setShowSandboxModal(true);
        setSubmitting(false);
        return;
      }

      // Real / Test Razorpay SDK Checkout
      if (typeof window.Razorpay !== "function") {
        setError("Razorpay SDK failed to load. Check your internet connection.");
        setSubmitting(false);
        return;
      }

      const options = {
        key: res.data.keyId,
        amount: res.data.amount,
        currency: res.data.currency,
        name: "FarmStayGo",
        description: `Booking Reservation #${bookingId.slice(-6)}`,
        order_id: res.data.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await apiFetch<{
              success: boolean;
              message: string;
              data: { confirmed: boolean };
            }>(`/bookings/${bookingId}/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: payAmount,
              }),
            });

            setSuccess(verifyRes.message || "Payment completed successfully!");
            setAmount("");
            await loadData();
          } catch (vErr) {
            setError(
              vErr instanceof ApiRequestError
                ? vErr.message
                : "Payment verification failed."
            );
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
        theme: { color: "#166534" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Could not initialize Razorpay checkout."
      );
      setSubmitting(false);
    }
  };

  // Confirm sandbox payment completion
  const confirmSandboxPayment = async () => {
    if (!sandboxOrderDetails) return;

    try {
      setSubmitting(true);
      setShowSandboxModal(false);

      const payAmount = Number(amount);

      const verifyRes = await apiFetch<{
        success: boolean;
        message: string;
        data: { confirmed: boolean };
      }>(`/bookings/${bookingId}/razorpay/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: sandboxOrderDetails.orderId,
          razorpay_payment_id: `pay_sandbox_${Date.now()}`,
          razorpay_signature: "sandbox_signature",
          amount: payAmount,
          sandbox: true,
        }),
      });

      setSuccess(verifyRes.message || "Sandbox payment recorded successfully!");
      setAmount("");
      await loadData();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Sandbox payment recording failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payAmount = Number(amount);
    if (!amount || payAmount <= 0) {
      setError("Enter a valid payment amount");
      return;
    }

    if (paymentMethod === "ONLINE") {
      await handleRazorpayCheckout(payAmount);
      return;
    }

    // Manual Cash/Bank Transfer recording
    try {
      setSubmitting(true);

      await apiFetch(`/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payAmount,
          paymentMethod,
          paymentType,
          transactionId: transactionId || null,
          notes: notes || null,
        }),
      });

      if (paymentMethod === "BANK_TRANSFER") {
        setSuccess("Bank transfer payment submitted successfully. Waiting for vendor approval.");
      } else {
        setSuccess("Payment recorded successfully");
      }
      setAmount("");
      setTransactionId("");
      setNotes("");
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : "Unable to record payment."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number | null | undefined) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: booking?.currency || "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const hasPendingBankTransfer = payments.some(
    (p) => p.paymentMethod === "BANK_TRANSFER" && p.status === "PENDING_APPROVAL"
  );

  const isPaymentLocked =
    summary?.paymentStatus === "PAID" ||
    summary?.paymentStatus === "REFUNDED" ||
    hasPendingBankTransfer;

  if (loading) {
    return (
      <main className="bg-[#f7f4ed] min-h-screen">
        <section className="site-container py-10 sm:py-14">
          <div className="h-10 w-64 animate-pulse rounded bg-white" />
          <div className="mt-6 h-96 animate-pulse rounded-2xl bg-white" />
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="bg-[#f7f4ed] min-h-screen">
        <section className="site-container py-10 sm:py-14">
          <div className="rounded-2xl border border-ink-100 bg-white px-6 py-12 text-center shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
            <h2 className="text-2xl font-extrabold text-ink-900">
              Booking not found
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-600">
              We could not find this booking on your account.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[#f7f4ed] min-h-screen py-10 sm:py-14">
      <section className="site-container">
        <div className="border-b border-ink-100 pb-6">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
            Payment & Confirmation
          </span>

          <h1 className="mt-2 text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Pay for Booking
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
            {booking.property.title} — Booking #{booking.id.slice(-8)}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-semibold text-emerald-800">
            {success}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          {isPaymentLocked ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
              <h2 className="text-lg font-extrabold text-ink-900">
                {summary?.paymentStatus === "PAID"
                  ? "Booking Fully Paid"
                  : hasPendingBankTransfer
                    ? "Payment Pending Approval"
                    : "Payment Locked"}
              </h2>
              <p className="mt-2 text-sm text-ink-600">
                {summary?.paymentStatus === "PAID"
                  ? "This booking has been fully paid. No further payments are required."
                  : hasPendingBankTransfer
                    ? "Your bank transfer is pending vendor approval. You can make another payment only after the vendor reviews this transaction."
                    : "This booking cannot accept additional payments at this time."}
              </p>
            </div>
          ) : (
            <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_8px_28px_rgba(27,58,39,0.08)]"
          >
            <h2 className="text-lg font-extrabold text-ink-900">
              Select Payment Option
            </h2>

            {summary?.reservationAmount && Number(summary.reservationAmount) > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Minimum Deposit Required
                </p>
                <p className="mt-1 text-sm text-amber-900">
                  Pay at least{" "}
                  <strong>{formatCurrency(Number(summary.reservationAmount))}</strong>{" "}
                  to instantly confirm your booking request.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setAmount(String(summary.reservationAmount))
                  }
                  className="mt-2 text-xs font-extrabold text-brand-700 underline hover:text-brand-800"
                >
                  Set Deposit Amount ({formatCurrency(Number(summary.reservationAmount))})
                </button>
              </div>
            )}

            <div className="mt-6 grid gap-5">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Amount to Pay (INR)
                </span>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-ink-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="h-11 w-full rounded-lg border border-ink-200 pl-8 pr-3 text-base font-extrabold text-ink-900 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Payment Method
                </span>

                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                >
                  {enabledPaymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method === "ONLINE"
                        ? "Razorpay Online (UPI / NetBanking / Cards)"
                        : method === "CASH"
                          ? "Cash on Check-in"
                          : "Direct Bank Transfer"}
                    </option>
                  ))}
                </select>
              </label>

              {paymentMethod !== "ONLINE" && (
                <>
                  {paymentMethod === "BANK_TRANSFER" && bankDetails && (
                    <div className="rounded-lg border border-ink-200 bg-ink-50 p-4">
                      <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink-500">
                        Vendor Bank Details
                      </h4>
                      <div className="mt-2 space-y-1 text-sm text-ink-800">
                        <p>
                          <span className="font-semibold text-ink-600">Account Name:</span>{" "}
                          {bankDetails.bankAccountName}
                        </p>
                        <p>
                          <span className="font-semibold text-ink-600">Account Number:</span>{" "}
                          <span className="font-mono">{bankDetails.bankAccountNumber}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-ink-600">IFSC Code:</span>{" "}
                          <span className="font-mono">{bankDetails.bankIfscCode}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                      Payment Type
                    </span>

                    <select
                      value={paymentType}
                      onChange={(e) =>
                        setPaymentType(e.target.value as PaymentType)
                      }
                      className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                    >
                      <option value="RESERVATION">Reservation Deposit</option>
                      <option value="INSTALLMENT">Installment</option>
                      <option value="BALANCE">Full Remaining Balance</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                      Transaction / Reference ID (Optional)
                    </span>

                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. UPI / UTR / Cash receipt number"
                      className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                      Notes (Optional)
                    </span>

                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes for vendor"
                      className="w-full resize-none rounded-lg border border-ink-200 px-3 py-3 text-sm text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                    />
                  </label>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !amount || Number(amount) <= 0}
              className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-brand-700 text-base font-extrabold text-white shadow-lg transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Processing..."
                : paymentMethod === "ONLINE"
                ? `Pay ${formatCurrency(Number(amount))} with Razorpay`
                : "Submit Payment Record"}
            </button>
          </form>
          )}

          {/* Payment & Booking Breakdown Sidebar */}
          <aside className="space-y-5">
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-500">
                Payment Breakdown
              </h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-600">Estimated Total</span>
                  <strong className="text-ink-900">
                    {formatCurrency(summary?.estimatedTotal)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-600">Required Deposit</span>
                  <strong className="text-amber-800">
                    {formatCurrency(summary?.reservationAmount)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm border-t border-ink-100 pt-3">
                  <span className="text-ink-600">Total Paid</span>
                  <strong className="text-emerald-700">
                    {formatCurrency(summary?.totalPaid)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-600">Outstanding Balance</span>
                  <strong className="text-red-700">
                    {formatCurrency(summary?.balance)}
                  </strong>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-3 text-sm">
                  <span className="text-ink-600">Payment Status</span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${
                      paymentStatusStyles[summary?.paymentStatus || "PENDING"] ||
                      paymentStatusStyles.PENDING
                    }`}
                  >
                    {paymentStatusLabels[summary?.paymentStatus || "PENDING"] ||
                      "Pending"}
                  </span>
                </div>

                {payments.some(
                  (p) =>
                    p.paymentMethod === "BANK_TRANSFER" &&
                    p.status === "PENDING_APPROVAL"
                ) && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
                      Bank Transfer Pending Approval
                    </p>
                    {payments
                      .filter(
                        (p) =>
                          p.paymentMethod === "BANK_TRANSFER" &&
                          p.status === "PENDING_APPROVAL"
                      )
                      .map((p) => (
                        <div key={p.id} className="mt-2 text-xs text-amber-800">
                          <p>
                            <span className="font-semibold">Amount:</span>{" "}
                            {formatCurrency(Number(p.amount))}
                          </p>
                          <p>
                            <span className="font-semibold">Transaction ID:</span>{" "}
                            <span className="font-mono">{p.transactionId || "Not provided"}</span>
                          </p>
                        </div>
                      ))}
                    <p className="mt-2 text-xs text-amber-700">
                      Your payment is pending vendor approval.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>

      {/* Interactive Sandbox Fallback Modal (When Razorpay API keys are not in backend .env) */}
      {showSandboxModal && sandboxOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-lg font-extrabold text-ink-900">
                  Razorpay Sandbox Gateway
                </h3>
              </div>
              <button
                onClick={() => setShowSandboxModal(false)}
                className="text-ink-400 hover:text-ink-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-900">
              <strong>Simulated Payment Environment:</strong> Razorpay API keys are not set in the backend environment. You can simulate a successful Razorpay payment below.
            </div>

            <div className="mt-5 space-y-2 text-sm text-ink-800">
              <div className="flex justify-between">
                <span className="text-ink-500">Order ID:</span>
                <span className="font-mono text-xs font-bold">{sandboxOrderDetails.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Amount:</span>
                <span className="font-extrabold text-emerald-700">{formatCurrency(sandboxOrderDetails.amount / 100)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmSandboxPayment}
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 text-sm font-extrabold text-white shadow transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {submitting ? "Confirming..." : "Simulate Successful Payment (Auto-Confirm)"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  setError("Payment was cancelled in sandbox modal.");
                }}
                className="h-10 w-full rounded-xl border border-ink-200 text-xs font-bold text-ink-600 hover:bg-ink-50"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

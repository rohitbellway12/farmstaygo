"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import type {
  PublicAvailabilityResponse,
  PublicPropertyDetail,
} from "@/types/public";

type BookingMode =
  | "ENTIRE_PROPERTY"
  | "ROOM_WISE";

interface BookingResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: string;
    reservationAmount: number | null;
    estimatedTotal: number | null;
  };
}

interface BookingQuoteResponse {
  success: boolean;
  message: string;
  data: {
    estimatedTotal: number;
    reservationAmount: number | null;
    currency: string;
    totalNights: number;
    roomTypeId?: string;
    bookingMode: BookingMode;
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

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatPrice(price: number | null): string {
  if (price === null) {
    return "Price on request";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

function getAuthToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const storedAuth = localStorage.getItem(
      "farmstaygo_customer_auth"
    );

    if (!storedAuth) {
      return "";
    }

    const parsed = JSON.parse(storedAuth);

    return parsed?.data?.token || "";
  } catch {
    return "";
  }
}

export default function BookingRequestPanel({
  property,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
}: {
  property: PublicPropertyDetail;
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
}) {
  const router = useRouter();

  const supportsEntire =
    property.bookingType === "ENTIRE_PROPERTY" ||
    property.bookingType === "BOTH";

  const supportsRooms =
    property.bookingType === "ROOM_WISE" ||
    property.bookingType === "BOTH";

  const today = useMemo(
    () => localDateKey(new Date()),
    []
  );

  const tomorrow = useMemo(
    () => localDateKey(addDays(new Date(), 1)),
    []
  );

  const [bookingMode, setBookingMode] =
    useState<BookingMode>(
      supportsEntire
        ? "ENTIRE_PROPERTY"
        : "ROOM_WISE"
    );

  const [roomTypeId, setRoomTypeId] =
    useState(
      property.roomTypes[0]?.id || ""
    );

  

  const [guests, setGuests] =
    useState("1");

  const [rooms, setRooms] =
    useState("1");

  const [specialRequest, setSpecialRequest] =
    useState("");

  const [availability, setAvailability] =
    useState<
      PublicAvailabilityResponse["data"] | null
    >(null);

  const [checking, setChecking] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [razorpayPaying, setRazorpayPaying] =
    useState(false);
  const [showSandboxModal, setShowSandboxModal] =
    useState(false);
  const [sandboxOrderDetails, setSandboxOrderDetails] =
    useState<{
      orderId: string;
      amount: number;
      currency: string;
      bookingId: string;
      bookingData: Record<string, unknown>;
    } | null>(null);

  const [enabledPaymentMethods, setEnabledPaymentMethods] =
    useState<string[]>(["ONLINE"]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("ONLINE");

  const [showBankTransferModal, setShowBankTransferModal] =
    useState(false);
  const [pendingBookingId, setPendingBookingId] =
    useState<string>("");
  const [bankDetails, setBankDetails] = useState<{
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfscCode: string;
  } | null>(null);
  const [bankTransferTransactionId, setBankTransferTransactionId] =
    useState("");
  const [bankTransferAmount, setBankTransferAmount] =
    useState("");
  const [bankTransferSubmitting, setBankTransferSubmitting] =
    useState(false);
  const [bankTransferError, setBankTransferError] =
    useState("");
  const [bankTransferSuccess, setBankTransferSuccess] =
    useState("");

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
          setSelectedPaymentMethod(
            res.data.paymentMethods[0]
          );
        }
      } catch {
        // keep defaults
      }
    };

    void loadPaymentMethods();
  }, []);

  const loadVendorBankDetails = useCallback(async () => {
    try {
      const res = await apiFetch<{
        success: boolean;
        data: {
          bankAccountName: string;
          bankAccountNumber: string;
          bankIfscCode: string;
        };
      }>(`/public/settings/vendor-bank-details?propertyId=${property.publicId}`);

      if (res.success) {
        setBankDetails(res.data);
      }
    } catch {
      // keep defaults
    }
  }, [property.publicId]);

  const selectedRoomAvailability =
    availability?.availability.roomBooking?.roomTypes.find(
      (roomType) =>
        roomType.roomTypeId === roomTypeId
    );

  const selectedRoom =
    property.roomTypes.find(
      (room) => room.id === roomTypeId
    ) || property.roomTypes[0];

  const currentModePrice =
    bookingMode === "ENTIRE_PROPERTY"
      ? property.pricing.entireProperty.basePrice
      : selectedRoom?.pricing.basePrice ?? null;

  const currentModePriceLabel =
    bookingMode === "ENTIRE_PROPERTY"
      ? "Full stay"
      : "Room price";

  const modeAvailable =
    bookingMode === "ENTIRE_PROPERTY"
      ? Boolean(
          availability?.availability
            .entireProperty?.available
        )
      : Boolean(
          selectedRoomAvailability?.available
        );

  const estimatedTotal = useMemo(() => {
    if (!checkIn || !checkOut) {
      return null;
    }

    const nights = Math.max(
      Math.round(
        (new Date(`${checkOut}T00:00:00`).getTime() -
          new Date(`${checkIn}T00:00:00`).getTime()) /
          (24 * 60 * 60 * 1000)
      ),
      0
    );

    if (nights === 0) {
      return null;
    }

    if (bookingMode === "ENTIRE_PROPERTY") {
      const price =
        property.pricing.entireProperty.basePrice;

      return price === null
        ? null
        : price * nights;
    }

    const price =
      selectedRoom?.pricing.basePrice ?? null;

    return price === null
      ? null
      : price * Number(rooms || 1) * nights;
  }, [
    bookingMode,
    checkIn,
    checkOut,
    property.pricing.entireProperty.basePrice,
    rooms,
    selectedRoom,
  ]);

  const reservationAmount = useMemo(() => {
    if (!checkIn || !checkOut) {
      return null;
    }

    const nights = Math.max(
      Math.round(
        (new Date(`${checkOut}T00:00:00`).getTime() -
          new Date(`${checkIn}T00:00:00`).getTime()) /
          (24 * 60 * 60 * 1000)
      ),
      0
    );

    if (nights === 0) {
      return null;
    }

    const perNight =
      bookingMode === "ENTIRE_PROPERTY"
        ? property.pricing.entireProperty
            .reservationAmountPerNight
        : selectedRoom?.pricing
            .reservationAmountPerNight;

    if (
      perNight === null ||
      perNight === undefined
    ) {
      return null;
    }

    return perNight * nights * (bookingMode === "ROOM_WISE" ? Number(rooms || 1) : 1);
  }, [
    bookingMode,
    checkIn,
    checkOut,
    property.pricing.entireProperty
      .reservationAmountPerNight,
    rooms,
    selectedRoom,
  ]);

  useEffect(() => {
    if (
      bookingMode === "ROOM_WISE" &&
      !roomTypeId &&
      property.roomTypes[0]
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoomTypeId(property.roomTypes[0].id);
    }
  }, [
    bookingMode,
    property.roomTypes,
    roomTypeId,
  ]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !window.Razorpay
    ) {
      const script =
        document.createElement("script");
      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (
      !checkIn ||
      !checkOut ||
      checkOut <= checkIn
    ) {
      return;
    }

    const timeout = window.setTimeout(
      async () => {
        try {
          setChecking(true);
          setMessage("");

          const params =
            new URLSearchParams({
              checkIn,
              checkOut,
              guests,
              rooms:
                bookingMode ===
                "ROOM_WISE"
                  ? rooms
                  : "1",
            });

          const response =
            await apiFetch<PublicAvailabilityResponse>(
              `/public/properties/${property.publicId}/availability?${params.toString()}`
            );

          setAvailability(response.data);
        } catch (error) {
          setAvailability(null);
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to check availability."
          );
        } finally {
          setChecking(false);
        }
      },
      350
    );

    return () =>
      window.clearTimeout(timeout);
  }, [
    bookingMode,
    checkIn,
    checkOut,
    guests,
    property.publicId,
    rooms,
  ]);

  const handleRazorpayCheckout = async (
    order: {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      sandbox: boolean;
    },
    bookingId: string,
    bookingData: Record<string, unknown>
  ) => {
    try {
      setRazorpayPaying(true);
      setMessage("");
      setSuccessMessage("");

      if (order.sandbox) {
        setSandboxOrderDetails({
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          bookingId,
          bookingData,
        });
        setShowSandboxModal(true);
        setRazorpayPaying(false);
        return;
      }

      if (
        typeof window.Razorpay !== "function"
      ) {
        setMessage(
          "Payment gateway failed to load. Please refresh and try again."
        );
        setRazorpayPaying(false);
        return;
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "FarmStayGo",
        description: `Booking Reservation`,
        order_id: order.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes =
              await apiFetch<BookingResponse>(
                `/bookings/${bookingId}/razorpay/verify`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    razorpay_order_id:
                      response.razorpay_order_id,
                    razorpay_payment_id:
                      response.razorpay_payment_id,
                    razorpay_signature:
                      response.razorpay_signature,
                    amount: order.amount / 100,
                  }),
                }
              );

            setSuccessMessage(
              verifyRes.message ||
                "Payment completed successfully!"
            );
            setMessage("");
            router.push(
              `/bookings`
            );
          } catch (vErr) {
            setMessage(
              vErr instanceof Error
                ? vErr.message
                : "Payment verification failed."
            );
            setSuccessMessage("");
          } finally {
            setRazorpayPaying(false);
          }
        },
        modal: {
          ondismiss: async () => {
            setRazorpayPaying(false);
          },
        },
        theme: { color: "#166534" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not initialize payment. Please try again."
      );
      setSuccessMessage("");
      setRazorpayPaying(false);
    }
  };

  const confirmSandboxPayment = async () => {
    if (!sandboxOrderDetails) return;

    try {
      setRazorpayPaying(true);
      setShowSandboxModal(false);

      const verifyRes = await apiFetch<BookingResponse>(
        `/bookings/${sandboxOrderDetails.bookingId}/razorpay/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            razorpay_order_id:
              sandboxOrderDetails.orderId,
            razorpay_payment_id: `pay_sandbox_${Date.now()}`,
            razorpay_signature:
              "sandbox_signature",
            amount:
              sandboxOrderDetails.amount /
              100,
            sandbox: true,
          }),
        }
      );

      setSuccessMessage(
        verifyRes.message ||
          "Sandbox payment recorded successfully!"
      );
      setMessage("");
      router.push(
        `/bookings`
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Sandbox payment recording failed."
      );
      setSuccessMessage("");
    } finally {
      setRazorpayPaying(false);
      setShowSandboxModal(false);
      setSandboxOrderDetails(null);
    }
  };

  const submitBooking = async () => {
    setMessage("");
    setSuccessMessage("");

    if (!getAuthToken()) {
      router.push(
        `/login?next=/properties/${property.publicId}`
      );
      return;
    }

    if (!modeAvailable) {
      setMessage(
        "Selected dates are not available for this booking option."
      );
      return;
    }

    try {
      setSubmitting(true);

      const bookingData = {
        propertyId: property.publicId,
        bookingMode,
        roomTypeId:
          bookingMode ===
          "ROOM_WISE"
            ? roomTypeId
            : undefined,
        checkIn,
        checkOut,
        guests: Number(guests),
        rooms:
          bookingMode ===
          "ROOM_WISE"
            ? Number(rooms)
            : 1,
        specialRequest,
        paymentMethod:
          selectedPaymentMethod,
      };

      if (
        selectedPaymentMethod === "ONLINE"
      ) {
        const quote =
          await apiFetch<BookingQuoteResponse>(
            "/bookings/calculate",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                bookingData
              ),
            }
          );

        const depositAmount =
          quote.data.reservationAmount &&
          Number(quote.data.reservationAmount) >
            0
            ? Number(quote.data.reservationAmount)
            : null;

        if (depositAmount) {
          // Reserve the slot first (creates a short hold) so a second
          // user cannot open payment for the same dates.
          let created: BookingResponse;

          try {
            created = await apiFetch<BookingResponse>(
              "/bookings",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify(
                  bookingData
                ),
              }
            );
          } catch (createErr) {
            setMessage(
              createErr instanceof Error
                ? createErr.message
                : "Sorry, this slot was just booked by someone else. Please choose different dates."
            );
            setSuccessMessage("");
            return;
          }

          const newBookingId = created.data.id;

          const order =
            await apiFetch<RazorpayOrderResponse>(
              `/bookings/${newBookingId}/razorpay/order`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  amount: depositAmount,
                }),
              }
            );

          await handleRazorpayCheckout(
            {
              orderId: order.data.orderId,
              amount: order.data.amount,
              currency: order.data.currency,
              keyId: order.data.keyId,
              sandbox: order.sandbox,
            },
            newBookingId,
            bookingData
          );
        } else {
          const response =
            await apiFetch<BookingResponse>(
              "/bookings",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify(
                  bookingData
                ),
              }
            );

          setSuccessMessage(
            response.message ||
              "Booking request submitted successfully."
          );
        }
      } else {
        const response =
          await apiFetch<BookingResponse>(
            "/bookings",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                bookingData
              ),
            }
          );

        const depositAmount =
          response.data.reservationAmount &&
          Number(response.data.reservationAmount) >
            0
            ? Number(response.data.reservationAmount)
            : null;

        if (
          depositAmount &&
          selectedPaymentMethod ===
            "BANK_TRANSFER"
        ) {
          setPendingBookingId(
            response.data.id
          );
          setBankTransferAmount(
            String(depositAmount)
          );
          setBankTransferTransactionId("");
          setBankTransferError("");
          setBankTransferSuccess("");
          void loadVendorBankDetails();
          setShowBankTransferModal(true);
        } else {
          setSuccessMessage(
            response.message ||
              "Booking request submitted successfully."
          );
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit booking request."
      );
      setSuccessMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  const submitBankTransfer = async () => {
    setBankTransferError("");
    setBankTransferSuccess("");

    if (!bankTransferTransactionId.trim()) {
      setBankTransferError(
        "Please enter a transaction ID or reference number."
      );
      return;
    }

    const amount = Number(bankTransferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBankTransferError(
        "Please enter a valid amount."
      );
      return;
    }

    try {
      setBankTransferSubmitting(true);

      await apiFetch(
        `/bookings/${pendingBookingId}/payments`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount,
            paymentMethod: "BANK_TRANSFER",
            paymentType: "RESERVATION",
            transactionId:
              bankTransferTransactionId.trim(),
            notes:
              "Bank transfer payment initiated by customer",
          }),
        }
      );

      setBankTransferSuccess(
        "Bank transfer details submitted successfully. Please wait for vendor approval."
      );
      setShowBankTransferModal(false);
      setSuccessMessage(
        "Booking request submitted successfully. Your bank transfer is pending vendor approval."
      );
    } catch (err) {
      setBankTransferError(
        err instanceof Error
          ? err.message
          : "Unable to submit bank transfer details."
      );
    } finally {
      setBankTransferSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-[0_14px_36px_rgba(27,58,39,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-ink-500">
            {currentModePriceLabel}
          </div>
          <div className="text-2xl font-extrabold text-ink-900">
            {formatPrice(
              currentModePrice
            )}
          </div>
          {property.bookingType === "BOTH" && (
            <div className="mt-1 text-xs font-semibold text-ink-500">
              {bookingMode ===
              "ENTIRE_PROPERTY"
                ? `Rooms from ${formatPrice(
                    property.pricing
                      .startingPrice
                  )}`
                : `Full stay ${formatPrice(
                    property.pricing
                      .entireProperty
                      .basePrice
                  )}`}
            </div>
          )}

          {reservationAmount !== null &&
            reservationAmount > 0 && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                Deposit: {formatPrice(reservationAmount)}
                <span className="mt-1 block font-semibold text-amber-600">
                  Required to confirm booking
                </span>
              </div>
            )}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
            checking
              ? "bg-ink-50 text-ink-600"
              : availability
                ? modeAvailable
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
                : "bg-brand-50 text-brand-700"
          }`}
        >
          {checking
            ? "Checking"
            : availability
              ? modeAvailable
                ? "Available"
                : "Unavailable"
              : "Select dates"}
        </span>
      </div>

      {property.bookingType === "BOTH" && (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-ink-50 p-1">
          <button
            type="button"
            onClick={() =>
              setBookingMode(
                "ENTIRE_PROPERTY"
              )
            }
            className={`h-10 rounded-md text-sm font-extrabold ${
              bookingMode ===
              "ENTIRE_PROPERTY"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-ink-500"
            }`}
          >
            Full Stay
          </button>

          <button
            type="button"
            onClick={() =>
              setBookingMode("ROOM_WISE")
            }
            className={`h-10 rounded-md text-sm font-extrabold ${
              bookingMode === "ROOM_WISE"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-ink-500"
            }`}
          >
            Room Wise
          </button>
        </div>
      )}

      {property.bookingType !== "BOTH" && (
        <div className="mt-5 rounded-lg bg-ink-50 px-4 py-3 text-sm font-bold text-ink-700">
          {supportsEntire
            ? "Full property booking"
            : "Room-wise booking"}
        </div>
      )}

      {bookingMode === "ROOM_WISE" && (
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
            Room Type
          </span>
          <select
            value={roomTypeId}
            onChange={(event) =>
              setRoomTypeId(
                event.target.value
              )
            }
            className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          >
            {property.roomTypes.map(
              (room) => (
                <option
                  key={room.id}
                  value={room.id}
                >
                  {room.name} -{" "}
                  {formatPrice(
                    room.pricing.basePrice
                  )}
                </option>
              )
            )}
          </select>
        </label>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
            Check-in
          </span>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(event) => {
              const nextCheckIn =
                event.target.value;
              onCheckInChange(nextCheckIn);
              if (
                checkOut <= nextCheckIn
              ) {
                onCheckOutChange(
                  localDateKey(
                    addDays(
                      new Date(
                        `${nextCheckIn}T00:00:00`
                      ),
                      1
                    )
                  )
                );
              }
            }}
            className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
            Check-out
          </span>
          <input
            type="date"
            min={
              checkIn
                ? localDateKey(
                    addDays(
                      new Date(
                        `${checkIn}T00:00:00`
                      ),
                      1
                    )
                  )
                : tomorrow
            }
            value={checkOut}
            onChange={(event) =>
              onCheckOutChange(event.target.value)
            }
            className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
            Guests
          </span>
          <input
            type="number"
            min="1"
            max="100"
            value={guests}
            onChange={(event) =>
              setGuests(
                event.target.value
              )
            }
            className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
            Rooms
          </span>
          <input
            type="number"
            min="1"
            max={
              selectedRoomAvailability
                ?.minimumAvailableRooms ||
              selectedRoom?.inventory
                .totalRooms ||
              1
            }
            disabled={
              bookingMode ===
              "ENTIRE_PROPERTY"
            }
            value={
              bookingMode ===
              "ENTIRE_PROPERTY"
                ? "1"
                : rooms
            }
            onChange={(event) =>
              setRooms(event.target.value)
            }
            className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none disabled:bg-ink-50 disabled:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>
      </div>

      {availability && (
        <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50 px-4 py-3">
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-semibold text-ink-500">
              Available modes
            </span>
            <strong className="text-right text-ink-800">
              {availability.availability.availableModes.length > 0
                ? availability.availability.availableModes
                    .map((mode) =>
                      mode ===
                      "ENTIRE_PROPERTY"
                        ? "Full"
                        : "Rooms"
                    )
                    .join(", ")
                : "None"}
            </strong>
          </div>

          {bookingMode === "ROOM_WISE" &&
            selectedRoomAvailability && (
              <div className="mt-2 flex justify-between gap-3 text-sm">
                <span className="font-semibold text-ink-500">
                  Rooms remaining
                </span>
                <strong className="text-ink-800">
                  {
                    selectedRoomAvailability.minimumAvailableRooms
                  }
                </strong>
              </div>
            )}

          <div className="mt-2 flex justify-between gap-3 text-sm">
            <span className="font-semibold text-ink-500">
              Selected price
            </span>
            <strong className="text-ink-800">
              {formatPrice(
                currentModePrice
              )}
            </strong>
          </div>

          <div className="mt-2 flex justify-between gap-3 text-sm">
            <span className="font-semibold text-ink-500">
              Estimated total
            </span>
            <strong className="text-ink-800">
              {formatPrice(estimatedTotal)}
            </strong>
          </div>

          {reservationAmount !== null &&
            reservationAmount > 0 && (
              <div className="mt-2 flex justify-between gap-3 text-sm">
                <span className="font-semibold text-amber-700">
                  Deposit payable now
                </span>
                <strong className="text-amber-800">
                  {formatPrice(reservationAmount)}
                </strong>
              </div>
            )}

          {reservationAmount !== null &&
            reservationAmount > 0 &&
            estimatedTotal !== null && (
              <div className="mt-2 flex justify-between gap-3 text-sm border-t border-ink-100 pt-2">
                <span className="font-semibold text-ink-500">
                  Balance after deposit
                </span>
                <strong className="text-ink-800">
                  {formatPrice(
                    estimatedTotal -
                      reservationAmount
                  )}
                </strong>
              </div>
            )}
        </div>
      )}

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
          Special Request
        </span>
        <textarea
          rows={3}
          maxLength={500}
          value={specialRequest}
          onChange={(event) =>
            setSpecialRequest(
              event.target.value
            )
          }
          placeholder="Arrival time, food preference or any note for the host"
          className="w-full resize-none rounded-lg border border-ink-200 px-3 py-3 text-sm text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        />
      </label>

      {enabledPaymentMethods.length > 1 && (
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
            Payment Method
          </span>
          <select
            value={selectedPaymentMethod}
            onChange={(event) =>
              setSelectedPaymentMethod(
                event.target.value
              )
            }
            className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          >
            {enabledPaymentMethods.map(
              (method) => (
                <option
                  key={method}
                  value={method}
                >
                  {method === "ONLINE"
                    ? "Razorpay Online (UPI / NetBanking / Cards)"
                    : method === "CASH"
                      ? "Cash on Check-in"
                      : "Direct Bank Transfer"}
                </option>
              )
            )}
          </select>
        </label>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <p>{successMessage}</p>

          <Link
            href="/bookings"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-800"
          >
            View My Bookings
          </Link>
        </div>
      )}

      <button
        type="button"
        disabled={
          submitting ||
          razorpayPaying ||
          checking ||
          !availability ||
          !modeAvailable
        }
        onClick={() =>
          void submitBooking()
        }
        className="mt-5 h-11 w-full rounded-lg bg-brand-700 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Submitting..."
          : razorpayPaying
            ? "Opening Payment..."
            : "Request Booking"}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-ink-500">
        Full address and host contact are shared after a confirmed booking.
        {reservationAmount !== null &&
          reservationAmount > 0 && (
            <span className="mt-1 block font-semibold text-amber-700">
              A deposit of {formatPrice(reservationAmount)} is required to confirm your booking.
            </span>
          )}
      </p>

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
                onClick={() => {
                  setShowSandboxModal(false);
                  setSandboxOrderDetails(null);
                }}
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
                <span className="font-extrabold text-emerald-700">{formatPrice(sandboxOrderDetails.amount / 100)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={confirmSandboxPayment}
                disabled={razorpayPaying}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 text-sm font-extrabold text-white shadow transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {razorpayPaying ? "Confirming..." : "Simulate Successful Payment (Auto-Confirm)"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSandboxModal(false);
                  setSandboxOrderDetails(null);
                  setMessage("Payment was cancelled.");
                }}
                className="h-10 w-full rounded-xl border border-ink-200 text-xs font-bold text-ink-600 hover:bg-ink-50"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {showBankTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-brand-500 animate-ping" />
                <h3 className="text-lg font-extrabold text-ink-900">
                  Bank Transfer Details
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowBankTransferModal(false);
                  setPendingBookingId("");
                  setBankTransferAmount("");
                  setBankTransferTransactionId("");
                  setBankTransferError("");
                  setBankTransferSuccess("");
                }}
                className="text-ink-400 hover:text-ink-700 font-bold"
              >
                ✕
              </button>
            </div>

            {bankDetails ? (
              <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Vendor Bank Account Details
                </h4>
                <div className="mt-3 space-y-2 text-sm text-ink-800">
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
            ) : (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                Unable to load vendor bank details. Please contact support.
              </div>
            )}

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Amount to Transfer (INR) *
                </span>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-ink-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={bankTransferAmount}
                    onChange={(e) => setBankTransferAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="h-11 w-full rounded-lg border border-ink-200 pl-8 pr-3 text-base font-extrabold text-ink-900 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                  Transaction / Reference ID *
                </span>
                <input
                  type="text"
                  value={bankTransferTransactionId}
                  onChange={(e) => setBankTransferTransactionId(e.target.value)}
                  placeholder="e.g. UTR / UPI / Bank reference number"
                  className="h-11 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
              </label>

              {bankTransferError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {bankTransferError}
                </div>
              )}

              {bankTransferSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {bankTransferSuccess}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={submitBankTransfer}
                  disabled={bankTransferSubmitting}
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-700 text-sm font-extrabold text-white shadow transition hover:bg-brand-800 disabled:opacity-50"
                >
                  {bankTransferSubmitting ? "Submitting..." : "Submit Bank Transfer"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBankTransferModal(false);
                    setPendingBookingId("");
                    setBankTransferAmount("");
                    setBankTransferTransactionId("");
                    setBankTransferError("");
                    setBankTransferSuccess("");
                  }}
                  className="h-10 w-full rounded-xl border border-ink-200 text-xs font-bold text-ink-600 hover:bg-ink-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

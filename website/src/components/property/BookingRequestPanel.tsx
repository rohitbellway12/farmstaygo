"use client";

import { useEffect, useMemo, useState } from "react";
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
  };
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
}: {
  property: PublicPropertyDetail;
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

  const [checkIn, setCheckIn] =
    useState(today);

  const [checkOut, setCheckOut] =
    useState(tomorrow);

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

  useEffect(() => {
    if (
      bookingMode === "ROOM_WISE" &&
      !roomTypeId &&
      property.roomTypes[0]
    ) {
      setRoomTypeId(property.roomTypes[0].id);
    }
  }, [
    bookingMode,
    property.roomTypes,
    roomTypeId,
  ]);

  useEffect(() => {
    if (
      !checkIn ||
      !checkOut ||
      checkOut <= checkIn
    ) {
      setAvailability(null);
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

      const response =
        await apiFetch<BookingResponse>(
          "/bookings",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              propertyId:
                property.publicId,
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
            }),
          }
        );

      setSuccessMessage(
        response.message ||
          "Booking request submitted successfully."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit booking request."
      );
    } finally {
      setSubmitting(false);
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
              setCheckIn(nextCheckIn);
              if (
                checkOut <= nextCheckIn
              ) {
                setCheckOut(
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
              setCheckOut(
                event.target.value
              )
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
          : "Request Booking"}
      </button>

      <p className="mt-3 text-center text-xs leading-5 text-ink-500">
        Full address and host contact are shared after a confirmed booking.
      </p>
    </div>
  );
}

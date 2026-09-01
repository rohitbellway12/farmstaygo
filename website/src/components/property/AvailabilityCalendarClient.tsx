"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { apiFetch } from "@/lib/api";
import type {
  PropertyBookingType,
  PublicAvailabilityResponse,
} from "@/types/public";

type Night =
  PublicAvailabilityResponse["data"]["nightlyAvailability"][number];

type DayStatus = {
  status: "available" | "partial" | "unavailable";
  fullText: string | null;
  roomText: string | null;
  roomCount: number;
  bookedRoomCount: number;
  totalRoomCount: number;
};

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

function getNextMonthDateKey(dateKey: string): string {
  const date = parseDateKey(dateKey);

  return localDateKey(
    new Date(date.getFullYear(), date.getMonth() + 1, 1)
  );
}

function getFirstOfMonthDateKey(dateKey: string): string {
  const date = parseDateKey(dateKey);

  return localDateKey(
    new Date(date.getFullYear(), date.getMonth(), 1)
  );
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function formatShortDate(dateKey: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(parseDateKey(dateKey));
}

function getStatusClasses(status: DayStatus["status"]): string {
  if (status === "available") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "partial") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function getDotClasses(status: DayStatus["status"]): string {
  if (status === "available") {
    return "bg-emerald-500";
  }

  if (status === "partial") {
    return "bg-amber-500";
  }

  return "bg-red-500";
}

function getStatusLabel(status: DayStatus["status"]): string {
  if (status === "available") {
    return "Available";
  }

  if (status === "partial") {
    return "Partial";
  }

  return "Unavailable";
}

function getDayStatus(
  night: Night,
  bookingType: PropertyBookingType
): DayStatus {
  const supportsFull =
    bookingType === "ENTIRE_PROPERTY" ||
    bookingType === "BOTH";

  const supportsRooms =
    bookingType === "ROOM_WISE" ||
    bookingType === "BOTH";

  const roomUsed = night.roomTypes.some(
    (roomType) =>
      roomType.manuallyBlocked > 0 ||
      (roomType.bookedRooms || 0) > 0
  );

  const roomCount = night.roomTypes.reduce(
    (total, roomType) =>
      total + roomType.availableRooms,
    0
  );

  const bookedRoomCount = night.roomTypes.reduce(
    (total, roomType) =>
      total + (roomType.bookedRooms || 0),
    0
  );

  const totalRoomCount = night.roomTypes.reduce(
    (total, roomType) =>
      total + roomType.totalRooms,
    0
  );

  const fullAvailable =
    supportsFull &&
    !night.propertyBlocked &&
    !night.entireBooked &&
    !roomUsed;

  const roomsAvailable =
    supportsRooms &&
    !night.propertyBlocked &&
    !night.entireBooked &&
    roomCount > 0;

  const states = [
    supportsFull ? fullAvailable : null,
    supportsRooms ? roomsAvailable : null,
  ].filter(
    (state): state is boolean =>
      typeof state === "boolean"
  );

  const status =
    states.every(Boolean)
      ? "available"
      : states.some(Boolean)
        ? "partial"
        : "unavailable";

  return {
    status,
    fullText: supportsFull
      ? fullAvailable
        ? "Full free"
        : night.entireBooked
          ? "Full booked"
          : "Full unavailable"
      : null,
    roomText: supportsRooms
      ? roomsAvailable
        ? `${roomCount} rooms free`
        : "Rooms full"
      : null,
    roomCount,
    bookedRoomCount,
    totalRoomCount,
  };
}

const STORAGE_KEY = "farmstay_booking_dates";

export default function AvailabilityCalendarClient({
  publicId,
  bookingType,
  initialCheckIn,
  onDateSelect,
}: {
  publicId: string;
  bookingType: PropertyBookingType;
  initialCheckIn?: string;
  onDateSelect?: (checkIn: string, checkOut: string) => void;
}) {
  const today = useMemo(
    () => localDateKey(new Date()),
    []
  );

  const firstOfMonth = useMemo(
    () => getFirstOfMonthDateKey(today),
    [today]
  );

  const [startDate, setStartDate] =
    useState(firstOfMonth);

  const [availability, setAvailability] =
    useState<
      PublicAvailabilityResponse["data"] | null
    >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [isOpen, setIsOpen] =
    useState(false);

  const [selectedCheckIn, setSelectedCheckIn] =
    useState<string | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] =
    useState<string | null>(null);

  const rangeEnd = useMemo(
    () => getNextMonthDateKey(startDate),
    [startDate]
  );

  const handleDateClick = (date: string) => {
    if (!selectedCheckIn || selectedCheckOut) {
      setSelectedCheckIn(date);
      setSelectedCheckOut(null);
    } else if (date > selectedCheckIn) {
      setSelectedCheckOut(date);
    } else {
      setSelectedCheckIn(date);
      setSelectedCheckOut(null);
    }
  };

  const handleConfirmDates = () => {
    if (selectedCheckIn && selectedCheckOut && onDateSelect) {
      onDateSelect(selectedCheckIn, selectedCheckOut);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ checkIn: selectedCheckIn, checkOut: selectedCheckOut }));
      setIsOpen(false);
    }
  };

  const handleOpenModal = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { checkIn: storedCheckIn, checkOut: storedCheckOut } = JSON.parse(stored);
        if (storedCheckIn) setSelectedCheckIn(storedCheckIn);
        if (storedCheckOut) setSelectedCheckOut(storedCheckOut);
      } catch {
        // ignore
      }
    }
    setIsOpen(true);
  };

  useEffect(() => {
    const controller =
      new AbortController();

    const loadAvailability = async () => {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams({
            checkIn: startDate,
            checkOut: rangeEnd,
            guests: "1",
            rooms: "1",
          });

        const response =
          await apiFetch<PublicAvailabilityResponse>(
            `/public/properties/${publicId}/availability?${params.toString()}`,
            {
              signal: controller.signal,
            }
          );

        setAvailability(response.data);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setAvailability(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load availability."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadAvailability();

    return () => controller.abort();
  }, [publicId, rangeEnd, startDate]);

  const nights =
    availability?.nightlyAvailability || [];

  const firstStatus = nights[0]
    ? getDayStatus(nights[0], bookingType)
    : null;

  const statusLabel = firstStatus
    ? getStatusLabel(firstStatus.status)
    : loading
      ? "Checking"
      : "Check availability";

  const modalTitle =
    `${formatShortDate(startDate)} - ${formatShortDate(
      localDateKey(
        addDays(parseDateKey(rangeEnd), -1)
      )
    )}`;

  return (
    <>
      <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-[0_12px_30px_rgba(27,58,39,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide text-ink-500">
              Availability
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                  firstStatus
                    ? getStatusClasses(
                        firstStatus.status
                      )
                    : "border-ink-200 bg-ink-50 text-ink-600"
                }`}
              >
                {statusLabel}
              </span>
              <span className="text-sm font-semibold text-ink-600">
                {formatShortDate(startDate)} to{" "}
                {formatShortDate(
                  localDateKey(
                    addDays(parseDateKey(rangeEnd), -1)
                  )
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="h-11 rounded-lg bg-brand-700 px-5 text-sm font-extrabold text-white transition hover:bg-brand-800"
          >
            Check Availability
          </button>
        </div>
      </section>

      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-modal-title"
          >
            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                <div>
                  <h2
                    id="availability-modal-title"
                    className="text-lg font-extrabold text-ink-900"
                  >
                    Availability
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-ink-500">
                    {modalTitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="hidden items-center gap-2 text-xs font-bold text-ink-500 sm:flex">
                    Check from
                    <input
                      type="date"
                      min={today}
                      value={startDate}
                      onChange={(event) =>
                        setStartDate(
                          event.target.value
                        )
                      }
                      className="h-9 rounded-lg border border-ink-200 px-3 text-xs font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-9 w-9 rounded-lg border border-ink-200 text-lg font-extrabold leading-none text-ink-700 transition hover:border-red-200 hover:text-red-700"
                    aria-label="Close availability modal"
                  >
                    x
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(90vh-82px)] overflow-y-auto p-5">
                <label className="mb-4 block sm:hidden">
                  <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-ink-500">
                    Check from
                  </span>
                  <input
                    type="date"
                    min={today}
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(
                        event.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm font-bold text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                  />
                </label>

                <div className="flex flex-wrap gap-3 text-xs font-bold text-ink-600">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Partial
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Unavailable
                  </span>
                </div>

                {loading && (
                  <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-600">
                    Checking latest dates...
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                {!loading && !error && (
                  <>
                    {selectedCheckIn && (
                      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
                        <div className="text-sm font-bold text-brand-800">
                          {selectedCheckOut ? (
                            <>
                              Selected: {formatShortDate(selectedCheckIn)} → {formatShortDate(selectedCheckOut)}
                            </>
                          ) : (
                            <>Check-in: {formatShortDate(selectedCheckIn)} - Click another date for check-out</>
                          )}
                        </div>
                        {selectedCheckIn && selectedCheckOut && (
                          <button
                            type="button"
                            onClick={handleConfirmDates}
                            className="ml-auto h-9 rounded-lg bg-brand-700 px-4 text-sm font-extrabold text-white hover:bg-brand-800"
                          >
                            Use These Dates
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {nights.map((night) => {
                        const status = getDayStatus(
                          night,
                          bookingType
                        );

                        const isSelected =
                          night.date === selectedCheckIn ||
                          night.date === selectedCheckOut;
                        const isInRange =
                          selectedCheckIn &&
                          selectedCheckOut &&
                          night.date > selectedCheckIn &&
                          night.date < selectedCheckOut;
                        const isClickable =
                          status.status !== "unavailable";

                        return (
                          <article
                            key={night.date}
                            onClick={() =>
                              isClickable && handleDateClick(night.date)
                            }
                            className={`min-h-[116px] rounded-lg border p-3 transition-all ${
                              isSelected
                                ? "ring-2 ring-brand-500 ring-offset-2"
                                : isInRange
                                  ? "ring-1 ring-brand-300"
                                  : ""
                            } ${getStatusClasses(status.status)} ${
                              isClickable
                                ? "cursor-pointer hover:shadow-md"
                                : "cursor-not-allowed opacity-60"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <strong className="text-sm">
                                {formatShortDate(
                                  night.date
                                )}
                              </strong>
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${getDotClasses(
                                  status.status
                                )}`}
                              />
                            </div>

                            <div className="mt-3 space-y-1.5 text-xs font-extrabold">
                              {status.fullText && (
                                <div>
                                  {status.fullText}
                                </div>
                              )}
                              {status.roomText && (
                                <div>
                                  {status.roomText}
                                </div>
                              )}
                              {status.totalRoomCount > 0 && (
                                <div>
                                  {status.roomCount} free /{" "}
                                  {status.bookedRoomCount} booked /{" "}
                                  {status.totalRoomCount} total rooms
                                </div>
                              )}
                            </div>

                            {night.roomTypes.length > 0 && (
                              <div className="mt-3 text-[11px] font-semibold leading-4 opacity-80">
                                {night.roomTypes
                                  .slice(0, 2)
                                  .map(
                                    (roomType) =>
                                      `${roomType.name}: ${roomType.availableRooms}/${roomType.totalRooms}`
                                  )
                                  .join(" | ")}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

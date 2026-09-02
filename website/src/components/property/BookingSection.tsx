"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

import type { PublicPropertyDetail } from "@/types/public";
import AvailabilityCalendarClient from "@/components/property/AvailabilityCalendarClient";
import BookingRequestPanel from "@/components/property/BookingRequestPanel";

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

const STORAGE_KEY = "farmstay_booking_dates";

type BookingSectionProps = {
  property: PublicPropertyDetail;
  initialCheckIn?: string;
  showCalendar?: boolean;
};

export default function BookingSection({
  property,
  initialCheckIn,
  showCalendar = true,
}: BookingSectionProps) {
  const today = useMemo(() => localDateKey(new Date()), []);
  const tomorrow = useMemo(() => localDateKey(addDays(new Date(), 1)), []);

  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(tomorrow);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const qCheckIn = params.get("checkIn");
    const qCheckOut = params.get("checkOut");

    if (qCheckIn) setCheckIn(qCheckIn);
    if (qCheckOut) setCheckOut(qCheckOut);

    if (window.location.hash === "#booking-panel" || (qCheckIn && qCheckOut)) {
      setTimeout(() => {
        const el = document.getElementById("booking-panel");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-brand-500", "ring-offset-2");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-brand-500", "ring-offset-2");
          }, 2000);
        }
      }, 300);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const { checkIn: newCheckIn, checkOut: newCheckOut } = JSON.parse(e.newValue);
          if (newCheckIn) setCheckIn(newCheckIn);
          if (newCheckOut) setCheckOut(newCheckOut);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const saveDatesToStorage = useCallback((newCheckIn: string, newCheckOut: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ checkIn: newCheckIn, checkOut: newCheckOut }));
  }, []);

  const handleCheckInChange = useCallback(
    (value: string) => {
      setCheckIn(value);
      if (checkOut <= value) {
        const newCheckOut = localDateKey(addDays(new Date(`${value}T00:00:00`), 1));
        setCheckOut(newCheckOut);
        saveDatesToStorage(value, newCheckOut);
      } else {
        saveDatesToStorage(value, checkOut);
      }
    },
    [checkOut, saveDatesToStorage]
  );

  const handleCheckOutChange = useCallback((value: string) => {
    setCheckOut(value);
    saveDatesToStorage(checkIn, value);
  }, [checkIn, saveDatesToStorage]);

  return (
    <div className="space-y-6">
      {showCalendar && (
        <AvailabilityCalendarClient
          publicId={property.publicId}
          bookingType={property.bookingType}
          initialCheckIn={checkIn}
          onDateSelect={(newCheckIn, newCheckOut) => {
            setCheckIn(newCheckIn);
            setCheckOut(newCheckOut);
            saveDatesToStorage(newCheckIn, newCheckOut);
          }}
        />
      )}
      <BookingRequestPanel
        property={property}
        checkIn={checkIn}
        checkOut={checkOut}
        onCheckInChange={handleCheckInChange}
        onCheckOutChange={handleCheckOutChange}
      />
    </div>
  );
}

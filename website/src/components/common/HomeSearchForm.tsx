"use client";

import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function FieldIcon({
  type,
}: {
  type: "location" | "calendar" | "guests";
}) {
  if (type === "location") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (type === "guests") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="9" cy="7" r="3.5" />
        <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20" />
        <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6" />
        <path d="M18 14a4.5 4.5 0 0 1 3 4.2V20" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

export default function HomeSearchForm() {
  const router = useRouter();

  const [location, setLocation] =
    useState("");
  const [checkIn, setCheckIn] =
    useState("");
  const [checkOut, setCheckOut] =
    useState("");
  const [guests, setGuests] =
    useState("2");
  const [rooms, setRooms] =
    useState("1");

  const minimumDate = useMemo(
    () => localDateKey(new Date()),
    []
  );

  const submitSearch = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const params = new URLSearchParams();

    if (location.trim()) {
      params.set(
        "search",
        location.trim()
      );
    }

    if (checkIn) {
      params.set("checkIn", checkIn);
    }

    if (checkOut) {
      params.set("checkOut", checkOut);
    }

    params.set("guests", guests);
    params.set("rooms", rooms);

    router.push(
      `/properties?${params.toString()}`
    );
  };

  return (
    <form
      onSubmit={submitSearch}
      className="grid gap-2 rounded-2xl bg-white p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] md:grid-cols-2 xl:grid-cols-[1.45fr_1fr_1fr_1.2fr_auto]"
    >
      <label className="flex min-h-[68px] items-center gap-3 rounded-xl border border-ink-100 px-4 transition focus-within:border-brand-400 focus-within:bg-brand-50/40">
        <span className="text-brand-700">
          <FieldIcon type="location" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold text-ink-800">
            Where are you going?
          </span>

          <input
            type="text"
            value={location}
            onChange={(event) =>
              setLocation(event.target.value)
            }
            placeholder="City, area or property"
            className="mt-1 w-full bg-transparent text-[13px] text-ink-900 outline-none placeholder:text-ink-400"
          />
        </span>
      </label>

      <label className="flex min-h-[68px] items-center gap-3 rounded-xl border border-ink-100 px-4 transition focus-within:border-brand-400">
        <span className="text-brand-700">
          <FieldIcon type="calendar" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold text-ink-800">
            Check-in
          </span>

          <input
            type="date"
            min={minimumDate}
            value={checkIn}
            onChange={(event) => {
              setCheckIn(event.target.value);

              if (
                checkOut &&
                event.target.value >= checkOut
              ) {
                setCheckOut("");
              }
            }}
            className="mt-1 w-full bg-transparent text-[13px] text-ink-700 outline-none"
          />
        </span>
      </label>

      <label className="flex min-h-[68px] items-center gap-3 rounded-xl border border-ink-100 px-4 transition focus-within:border-brand-400">
        <span className="text-brand-700">
          <FieldIcon type="calendar" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold text-ink-800">
            Check-out
          </span>

          <input
            type="date"
            min={checkIn || minimumDate}
            value={checkOut}
            onChange={(event) =>
              setCheckOut(event.target.value)
            }
            className="mt-1 w-full bg-transparent text-[13px] text-ink-700 outline-none"
          />
        </span>
      </label>

      <div className="flex min-h-[68px] items-center gap-3 rounded-xl border border-ink-100 px-4">
        <span className="text-brand-700">
          <FieldIcon type="guests" />
        </span>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <label>
            <span className="block text-[11px] font-extrabold text-ink-800">
              Guests
            </span>

            <select
              value={guests}
              onChange={(event) =>
                setGuests(event.target.value)
              }
              className="mt-1 w-full bg-transparent text-[13px] text-ink-700 outline-none"
            >
              {Array.from(
                { length: 20 },
                (_, index) => index + 1
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="block text-[11px] font-extrabold text-ink-800">
              Rooms
            </span>

            <select
              value={rooms}
              onChange={(event) =>
                setRooms(event.target.value)
              }
              className="mt-1 w-full bg-transparent text-[13px] text-ink-700 outline-none"
            >
              {Array.from(
                { length: 10 },
                (_, index) => index + 1
              ).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="inline-flex min-h-[68px] items-center justify-center rounded-xl bg-brand-700 px-7 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-800"
      >
        Search Stays
      </button>
    </form>
  );
}

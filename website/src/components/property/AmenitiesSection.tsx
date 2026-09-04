"use client";

import { useEffect, useState } from "react";

import { getAssetUrl } from "@/lib/assets";
import type { PublicRoomType } from "@/types/public";

type Amenity = {
  id: string;
  name: string;
  icon: string | null;
  image: string | null;
  group: string;
};

type AmenitiesSectionProps = {
  amenities: Amenity[];
  roomTypes?: PublicRoomType[];
  bookingType?: string;
};

function getAmenityInitial(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function AmenitiesSection({
  amenities: propertyAmenities,
  roomTypes = [],
  bookingType,
}: AmenitiesSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [bookingMode, setBookingMode] = useState(
    bookingType === "ROOM_WISE" ? "ROOM_WISE" : "ENTIRE_PROPERTY"
  );
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id || "");
  const INITIAL_COUNT = 6;

  useEffect(() => {
    const handleBookingSelection = (event: Event) => {
      const detail = (event as CustomEvent<{
        bookingMode?: string;
        roomTypeId?: string;
      }>).detail;

      if (detail.bookingMode) setBookingMode(detail.bookingMode);
      if (detail.roomTypeId) setRoomTypeId(detail.roomTypeId);
    };

    window.addEventListener("farmstay-booking-selection", handleBookingSelection);
    return () =>
      window.removeEventListener(
        "farmstay-booking-selection",
        handleBookingSelection
      );
  }, []);

  const selectedRoom = roomTypes.find((room) => room.id === roomTypeId);
  const amenities =
    bookingMode === "ROOM_WISE" && selectedRoom
      ? selectedRoom.amenities
      : propertyAmenities;

  useEffect(() => {
    setShowAll(false);
  }, [bookingMode, roomTypeId]);

  const hasMore = amenities.length > INITIAL_COUNT;
  const visibleAmenities = showAll ? amenities : amenities.slice(0, INITIAL_COUNT);

  if (amenities.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Amenities will be updated soon.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {visibleAmenities.map((amenity) => (
          <div
            key={amenity.id}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-ink-100 bg-white p-3 text-center shadow-[0_8px_20px_rgba(27,58,39,0.05)]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
              {amenity.image ? (
                <img
                  src={getAssetUrl(amenity.image)}
                  alt={amenity.name}
                  className="h-5 w-5 object-contain"
                />
              ) : amenity.icon ? (
                <span className="text-sm">{amenity.icon}</span>
              ) : (
                <span className="text-xs font-extrabold">
                  {getAmenityInitial(amenity.name)}
                </span>
              )}
            </span>
            <span className="block text-xs font-bold leading-tight text-ink-700 line-clamp-2">
              {amenity.name}
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-4 flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800"
        >
          {showAll ? (
            <>
              <span>Show Less</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 15l6-6 6 6" />
              </svg>
            </>
          ) : (
            <>
              <span>View More ({amenities.length - INITIAL_COUNT} more)</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </>
          )}
        </button>
      )}
    </>
  );
}

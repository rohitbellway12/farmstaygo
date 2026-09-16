"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/metaPixel";
import type { PublicPropertyDetail } from "@/types/public";

interface PropertyPixelTrackerProps {
  property: PublicPropertyDetail;
}

let lastTrackedPublicId = "";
let lastTrackedTime = 0;

export default function PropertyPixelTracker({
  property,
}: PropertyPixelTrackerProps) {
  useEffect(() => {
    if (!property?.publicId) return;

    const now = Date.now();
    // Prevent duplicate event firing in React Strict Mode or re-renders
    if (
      lastTrackedPublicId === property.publicId &&
      now - lastTrackedTime < 2000
    ) {
      return;
    }
    lastTrackedPublicId = property.publicId;
    lastTrackedTime = now;

    const price =
      property.pricing?.startingPrice ??
      property.pricing?.entireProperty?.basePrice ??
      0;

    trackEvent("ViewContent", {
      content_name: property.displayTitle,
      content_category: property.category?.name || property.bookingType,
      content_ids: [property.publicId],
      content_type: "product",
      value: price,
      currency: property.pricing?.currency || "INR",
    });
  }, [property]);

  return null;
}

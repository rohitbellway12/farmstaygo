"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/metaPixel";
import type { PublicPropertyDetail } from "@/types/public";

interface PropertyPixelTrackerProps {
  property: PublicPropertyDetail;
}

export default function PropertyPixelTracker({
  property,
}: PropertyPixelTrackerProps) {
  useEffect(() => {
    if (!property) return;

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

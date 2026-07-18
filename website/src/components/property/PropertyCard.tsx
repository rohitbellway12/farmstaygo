import Link from "next/link";

import { getAssetUrl } from "@/lib/assets";
import type {
  PublicPropertyCard as Property,
} from "@/types/public";

function formatPrice(
  price: number | null
): string {
  if (price === null) {
    return "Price on request";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(price);
}

export default function PropertyCard({
  property,
  href,
}: {
  property: Property;
  href?: string;
}) {
  const imageUrl = getAssetUrl(
    property.coverImage?.image
  );

  const location = [
    property.location.area,
    property.location.city,
    property.location.state,
  ]
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

  const detailsHref =
    href ||
    `/properties/${property.publicId}`;

  return (
    <article className="group overflow-hidden rounded-xl border border-ink-100 bg-white shadow-[0_8px_28px_rgba(27,58,39,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(27,58,39,0.14)]">
      <div className="relative h-52 overflow-hidden bg-brand-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={property.displayTitle}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-brand-700">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5.5 10.5V20h13v-9.5" />
              <path d="M9.5 20v-6h5v6" />
            </svg>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-brand-700 shadow-sm">
          Verified Property
        </span>

        <span className="absolute bottom-3 left-3 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-brand-700 shadow-sm">
          {property.category.name}
        </span>

        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink-700 shadow-sm">
          <svg
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
          </svg>
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 text-base font-extrabold text-ink-900">
          {property.displayTitle}
        </h3>

        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ink-500">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {location ||
            "Location available after booking"}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-600">
          <span>
            {property.capacity.maxGuests ??
              "—"}{" "}
            Guests
          </span>

          <span className="text-ink-300">
            •
          </span>

          <span>
            {property.capacity.bedrooms ??
              property.roomTypeCount}{" "}
            {property.capacity.bedrooms
              ? "Bedrooms"
              : "Room Types"}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <strong className="block text-lg font-extrabold text-ink-900">
              {formatPrice(
                property.pricing
                  .startingPrice
              )}
            </strong>

            <span className="text-[11px] text-ink-500">
              starting price / night
            </span>
          </div>

          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">
            {property.availability.checked
              ? property.availability
                  .available
                ? "Available"
                : "Unavailable"
              : "Check dates"}
          </span>
        </div>

        <Link
          href={detailsHref}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-700 text-[12px] font-extrabold text-white transition hover:bg-brand-800"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

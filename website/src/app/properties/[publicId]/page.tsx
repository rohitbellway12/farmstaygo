import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiRequestError, apiFetch } from "@/lib/api";
import { getAssetUrl } from "@/lib/assets";
import type {
  PublicImage,
  PublicPropertyDetail,
  PublicPropertyDetailResponse,
} from "@/types/public";

type PageProps = {
  params: Promise<{
    publicId: string;
  }>;
  searchParams?: Promise<
    Record<string, string | string[] | undefined>
  >;
};

const queryKeys = [
  "checkIn",
  "checkOut",
  "guests",
  "rooms",
] as const;

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

function formatBookingType(
  bookingType: PublicPropertyDetail["bookingType"]
): string {
  const labels = {
    ENTIRE_PROPERTY: "Entire property",
    ROOM_WISE: "Room-wise booking",
    BOTH: "Entire property and rooms",
  };

  return labels[bookingType];
}

function buildDetailQuery(
  searchParams: Record<
    string,
    string | string[] | undefined
  >
): string {
  const params = new URLSearchParams();

  queryKeys.forEach((key) => {
    const value = searchParams[key];

    if (typeof value === "string" && value.trim()) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return query ? `?${query}` : "";
}

function getLocation(
  property: PublicPropertyDetail
): string {
  return [
    property.location.area,
    property.location.city,
    property.location.state,
    property.location.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function ImageTile({
  image,
  title,
  className = "",
}: {
  image: PublicImage;
  title: string;
  className?: string;
}) {
  return (
    <img
      src={getAssetUrl(image.image)}
      alt={image.altText || title}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

function StatItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
        {label}
      </div>
      <div className="mt-1 text-base font-extrabold text-ink-900">
        {value}
      </div>
    </div>
  );
}

function DetailIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
      {children}
    </span>
  );
}

async function getProperty(
  publicId: string,
  query: string
): Promise<PublicPropertyDetail> {
  try {
    const response =
      await apiFetch<PublicPropertyDetailResponse>(
        `/public/properties/${publicId}${query}`
      );

    return response.data;
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      error.status === 404
    ) {
      notFound();
    }

    throw error;
  }
}

export default async function PropertyDetailsPage({
  params,
  searchParams,
}: PageProps) {
  const { publicId } = await params;
  const resolvedSearchParams =
    (await searchParams) || {};
  const query = buildDetailQuery(
    resolvedSearchParams
  );
  const property = await getProperty(publicId, query);

  const coverImage =
    property.images.find((image) => image.isCover) ||
    property.images[0] ||
    null;

  const galleryImages = property.images
    .filter((image) => image.id !== coverImage?.id)
    .slice(0, 4);

  const location = getLocation(property);

  return (
    <div className="bg-[#f8faf8]">
      <section className="border-b border-ink-100 bg-white">
        <div className="site-container py-7">
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <Link
              href="/"
              className="font-semibold hover:text-brand-700"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/properties"
              className="font-semibold hover:text-brand-700"
            >
              Properties
            </Link>
            <span>/</span>
            <span className="text-ink-700">
              Details
            </span>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">
                  Verified Property
                </span>
                <span className="rounded-full bg-gold-50 px-3 py-1 text-xs font-extrabold text-gold-600">
                  {property.category.name}
                </span>
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight text-ink-900 md:text-5xl">
                {property.displayTitle}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-600 md:text-base">
                {location ||
                  "Exact location is protected until booking is confirmed."}
              </p>
            </div>

            <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-500">
                Starting Price
              </div>
              <div className="mt-1 text-3xl font-extrabold text-ink-900">
                {formatPrice(
                  property.pricing.startingPrice
                )}
              </div>
              <div className="mt-1 text-xs text-ink-500">
                per night before taxes and fees
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-container py-6">
        <div className="grid h-[460px] gap-3 overflow-hidden rounded-xl md:grid-cols-[2fr_1fr]">
          {coverImage ? (
            <ImageTile
              image={coverImage}
              title={property.displayTitle}
            />
          ) : (
            <div className="grid h-full place-items-center bg-brand-50 text-brand-700">
              No image available
            </div>
          )}

          <div className="hidden grid-cols-2 gap-3 md:grid">
            {galleryImages.length > 0
              ? galleryImages.map((image) => (
                  <ImageTile
                    key={image.id}
                    image={image}
                    title={property.displayTitle}
                  />
                ))
              : Array.from({ length: 4 }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="bg-brand-50"
                    />
                  )
                )}
          </div>
        </div>
      </section>

      <section className="site-container grid gap-8 pb-14 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatItem
              label="Guests"
              value={`${
                property.capacity.maxGuests || "Flexible"
              }`}
            />
            <StatItem
              label="Bedrooms"
              value={`${
                property.capacity.bedrooms ??
                property.roomTypes.length
              }`}
            />
            <StatItem
              label="Bathrooms"
              value={`${
                property.capacity.bathrooms ??
                "Available"
              }`}
            />
            <StatItem
              label="Booking"
              value={formatBookingType(
                property.bookingType
              )}
            />
          </div>

          <section>
            <h2 className="text-2xl font-extrabold text-ink-900">
              About This Stay
            </h2>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-ink-600 md:text-base">
              {property.description ||
                property.shortDescription ||
                "More details about this property will be available soon."}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-extrabold text-ink-900">
              Amenities
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {property.amenities.length > 0 ? (
                property.amenities.map((amenity) => (
                  <div
                    key={amenity.id}
                    className="flex items-center gap-3 rounded-lg border border-ink-100 bg-white p-4"
                  >
                    <DetailIcon>
                      <span className="text-sm font-extrabold">
                        {amenity.icon || amenity.name[0]}
                      </span>
                    </DetailIcon>
                    <span className="font-bold text-ink-800">
                      {amenity.name}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-500">
                  Amenities will be updated soon.
                </p>
              )}
            </div>
          </section>

          {property.roomTypes.length > 0 && (
            <section>
              <h2 className="text-2xl font-extrabold text-ink-900">
                Room Options
              </h2>
              <div className="mt-4 space-y-4">
                {property.roomTypes.map((room) => (
                  <article
                    key={room.id}
                    className="grid overflow-hidden rounded-xl border border-ink-100 bg-white md:grid-cols-[220px_minmax(0,1fr)]"
                  >
                    <div className="h-48 bg-brand-50 md:h-full">
                      {room.images[0] ? (
                        <ImageTile
                          image={room.images[0]}
                          title={room.name}
                        />
                      ) : null}
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-extrabold text-ink-900">
                            {room.name}
                          </h3>
                          <p className="mt-1 text-sm text-ink-500">
                            Up to {room.capacity.maxGuests} guests
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-extrabold text-ink-900">
                            {formatPrice(
                              room.pricing.basePrice
                            )}
                          </div>
                          <div className="text-xs text-ink-500">
                            per room / night
                          </div>
                        </div>
                      </div>

                      {room.description && (
                        <p className="mt-3 text-sm leading-6 text-ink-600">
                          {room.description}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ink-600">
                        <span className="rounded-full bg-ink-50 px-3 py-1">
                          {room.inventory.totalRooms} rooms
                        </span>
                        <span className="rounded-full bg-ink-50 px-3 py-1">
                          {room.capacity.beds} beds
                        </span>
                        <span className="rounded-full bg-ink-50 px-3 py-1">
                          {room.capacity.bathrooms} baths
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-[0_14px_36px_rgba(27,58,39,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-ink-500">
                  From
                </div>
                <div className="text-2xl font-extrabold text-ink-900">
                  {formatPrice(
                    property.pricing.startingPrice
                  )}
                </div>
              </div>

              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">
                {property.availability.checked
                  ? property.availability.available
                    ? "Available"
                    : "Unavailable"
                  : "Check dates"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-ink-700">
              <div className="flex justify-between gap-3 border-b border-ink-100 pb-3">
                <span>Check-in</span>
                <strong>
                  {property.stayInformation.checkInTime ||
                    "Flexible"}
                </strong>
              </div>
              <div className="flex justify-between gap-3 border-b border-ink-100 pb-3">
                <span>Check-out</span>
                <strong>
                  {property.stayInformation.checkOutTime ||
                    "Flexible"}
                </strong>
              </div>
              <div className="flex justify-between gap-3 border-b border-ink-100 pb-3">
                <span>Minimum stay</span>
                <strong>
                  {property.stayInformation.minimumStay} night
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Location privacy</span>
                <strong>Protected</strong>
              </div>
            </div>

            <button className="mt-5 h-11 w-full rounded-lg bg-brand-700 text-sm font-extrabold text-white transition hover:bg-brand-800">
              Request Booking
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-ink-500">
              Full address and host contact are shared after a confirmed booking.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

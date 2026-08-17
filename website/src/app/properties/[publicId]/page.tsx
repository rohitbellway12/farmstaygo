import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiRequestError, apiFetch } from "@/lib/api";
import { getAssetUrl } from "@/lib/assets";
import AvailabilityCalendarClient from "@/components/property/AvailabilityCalendarClient";
import BookingRequestPanel from "@/components/property/BookingRequestPanel";
import PropertyMapClient from "@/components/property/PropertyMapClient";
import type {
  PublicImage,
  PublicPropertyCard,
  PublicPropertyDetail,
  PublicPropertyDetailResponse,
  PublicRelatedPropertiesResponse,
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

function getPrimaryPriceLabel(
  property: PublicPropertyDetail
): string {
  if (property.bookingType === "BOTH") {
    return "Rooms From";
  }

  if (property.bookingType === "ROOM_WISE") {
    return "Rooms From";
  }

  return "Full Stay";
}

function getLowestRoomPrice(
  property: PublicPropertyDetail
): number | null {
  const prices = property.roomTypes
    .map((room) => room.pricing.basePrice)
    .filter(
      (price): price is number =>
        typeof price === "number" &&
        price > 0
    );

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

function getAmenityInitial(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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

async function getRelatedProperties(
  publicId: string
): Promise<PublicPropertyCard[]> {
  try {
    const response =
      await apiFetch<PublicRelatedPropertiesResponse>(
        `/public/properties/${publicId}/related`
      );

    return response.data;
  } catch {
    return [];
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
  const relatedProperties =
    await getRelatedProperties(publicId);

  const coverImage =
    property.images.find((image) => image.isCover) ||
    property.images[0] ||
    null;

  const galleryImages = property.images
    .filter((image) => image.id !== coverImage?.id)
    .slice(0, 4);

  const location = getLocation(property);
  const lowestRoomPrice =
    getLowestRoomPrice(property);

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

              <p className="mt-3 flex flex-wrap items-center gap-3 text-sm leading-6 text-ink-600 md:text-base">
                <span>{location}</span>
              </p>
            </div>

            <div className="rounded-xl border border-ink-100 bg-ink-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-500">
                {getPrimaryPriceLabel(property)}
              </div>
              <div className="mt-1 text-3xl font-extrabold text-ink-900">
                {formatPrice(
                  property.pricing.startingPrice
                )}
              </div>
              {property.bookingType === "BOTH" && (
                <div className="mt-3 grid gap-2 text-xs font-semibold text-ink-600">
                  <div className="flex justify-between gap-3">
                    <span>Full stay</span>
                    <strong className="text-ink-900">
                      {formatPrice(
                        property.pricing
                          .entireProperty
                          .basePrice
                      )}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Room-wise</span>
                    <strong className="text-ink-900">
                      {formatPrice(
                        lowestRoomPrice
                      )}
                    </strong>
                  </div>
                </div>
              )}
              {property.bookingType !== "BOTH" && (
                <div className="mt-1 text-xs text-ink-500">
                  per night before taxes and fees
                </div>
              )}
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
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-100 pb-3">
              <div>
                <h2 className="text-2xl font-extrabold text-ink-900">
                  Amenities
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Facilities included with this stay
                </p>
              </div>
              {property.amenities.length > 0 && (
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand-700">
                  {property.amenities.length} available
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {property.amenities.length > 0 ? (
                property.amenities.map((amenity) => (
                  <div
                    key={amenity.id}
                    className="flex min-h-[76px] items-center gap-3 rounded-lg border border-ink-100 bg-white p-4 shadow-[0_8px_20px_rgba(27,58,39,0.05)]"
                  >
                    <DetailIcon>
                      <span className="text-xs font-extrabold">
                        {getAmenityInitial(
                          amenity.name
                        )}
                      </span>
                    </DetailIcon>
                    <div className="min-w-0">
                      <span className="block truncate font-bold text-ink-800">
                        {amenity.name}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold capitalize text-ink-500">
                        {amenity.group.toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-500">
                  Amenities will be updated soon.
                </p>
              )}
            </div>
          </section>

          {property.rules.length > 0 && (
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-100 pb-3">
                <div>
                  <h2 className="text-2xl font-extrabold text-ink-900">
                    House Rules
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Policies and guidelines for this stay
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {property.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex min-h-[76px] items-center gap-3 rounded-lg border border-ink-100 bg-white p-4 shadow-[0_8px_20px_rgba(27,58,39,0.05)]"
                  >
                    <DetailIcon>
                      <span className="text-xs font-extrabold">
                        {rule.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join("")}
                      </span>
                    </DetailIcon>
                    <div className="min-w-0">
                      <span className="block truncate font-bold text-ink-800">
                        {rule.name}
                      </span>
                      {rule.description && (
                        <span className="mt-0.5 block text-xs font-semibold text-ink-500">
                          {rule.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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

          <AvailabilityCalendarClient
            publicId={property.publicId}
            bookingType={property.bookingType}
            initialCheckIn={
              typeof resolvedSearchParams.checkIn ===
                "string"
                  ? resolvedSearchParams.checkIn
                  : undefined
            }
          />

          <PropertyMapClient
            latitude={property.location.latitude}
            longitude={property.location.longitude}
            area={property.location.area}
            city={property.location.city}
            state={property.location.state}
            country={property.location.country}
          />

          {relatedProperties.length > 0 && (
            <section>
              <h2 className="text-2xl font-extrabold text-ink-900">
                Similar properties near{" "}
                {property.location.city || "you"}
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                More stays in the same city
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProperties.map(
                  (related) => (
                    <Link
                      key={related.publicId}
                      href={`/properties/${related.publicId}`}
                      className="group overflow-hidden rounded-xl border border-ink-100 bg-white transition hover:shadow-lg"
                    >
                      <div className="aspect-[16/10] bg-brand-50">
                        {related.coverImage ? (
                          <img
                            src={getAssetUrl(
                              related.coverImage.image
                            )}
                            alt={
                              related.coverImage.altText ||
                              related.displayTitle
                            }
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs font-bold text-brand-700">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-extrabold text-ink-900 line-clamp-1">
                          {related.displayTitle}
                        </h3>
                        <p className="mt-1 text-xs text-ink-500 line-clamp-1">
                          {[
                            related.location.area,
                            related.location.city,
                            related.location.state,
                          ]
                            .filter(Boolean)
                            .join(", ") ||
                            "Location not specified"}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-sm font-extrabold text-ink-900">
                            {formatPrice(
                              related.pricing.startingPrice
                            )}
                          </span>
                          <span className="text-xs text-ink-500">
                            {related.pricing.unit === "PER_NIGHT"
                              ? "per night"
                              : "per room / night"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingRequestPanel
            property={property}
          />
        </aside>
      </section>
    </div>
  );
}

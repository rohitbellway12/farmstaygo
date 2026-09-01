"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, type KeyboardEvent } from "react";

import { getAssetUrl } from "@/lib/assets";
import { apiFetch, ApiRequestError } from "@/lib/api";
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

function getPrimaryPriceLabel(
  property: Property
): string {
  if (property.bookingType === "BOTH") {
    return "Rooms from";
  }

  if (property.bookingType === "ROOM_WISE") {
    return "Rooms from";
  }

  return "Full stay";
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

export default function PropertyCard({
  property,
  href,
}: {
  property: Property;
  href?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const images = property.images && property.images.length > 0
    ? property.images
    : property.coverImage
      ? [property.coverImage]
      : [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (event: React.MouseEvent) => {
    event.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    setCurrentImageIndex(index);
  };

  const imageUrl = getAssetUrl(images[currentImageIndex]?.image);

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

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem("farmstaygo_customer_auth");

      if (!authData) {
        setIsLoggedIn(false);
        setIsWishlisted(false);
        return;
      }

      try {
        const parsed = JSON.parse(authData);
        setIsLoggedIn(Boolean(parsed?.data?.user));
      } catch {
        localStorage.removeItem("farmstaygo_customer_auth");
        setIsLoggedIn(false);
        setIsWishlisted(false);
      }
    };

    checkAuth();
    window.addEventListener("auth-change", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("auth-change", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let cancelled = false;

    const loadWishlistState = async () => {
      try {
        const response = await apiFetch<{
          data: Array<{
            publicId: string;
          }>;
        }>("/wishlist");

        if (!cancelled) {
          setIsWishlisted(
            response.data.some(
              (item) =>
                item.publicId === property.publicId
            )
          );
        }
      } catch {
        if (!cancelled) {
          setIsWishlisted(false);
        }
      }
    };

    void loadWishlistState();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, property.publicId]);

  const toggleWishlist = async () => {
    if (!isLoggedIn) {
      router.push(
        `/login?next=${encodeURIComponent("/wishlist")}`
      );
      return;
    }

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await apiFetch("/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: property.publicId }),
        });
        setIsWishlisted(false);
      } else {
        await apiFetch("/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: property.publicId }),
        });
        setIsWishlisted(true);

        if (pathname !== "/wishlist") {
          router.push("/wishlist");
        }
      }
    } catch (error) {
      if (error instanceof ApiRequestError) {
        console.error("Wishlist error:", error.message);
      }
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleCardClick = () => {
    router.push(detailsHref);
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLElement>
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(detailsHref);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
      className="group cursor-pointer overflow-hidden rounded-xl border border-ink-100 bg-white shadow-[0_8px_28px_rgba(27,58,39,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(27,58,39,0.14)]"
    >
      <div
        className="relative h-52 overflow-hidden bg-brand-50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={images[currentImageIndex]?.altText || property.displayTitle}
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

        {images.length > 1 && isHovered && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
              aria-label="Previous image"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-700" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-md transition hover:bg-white"
              aria-label="Next image"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-700" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => goToImage(e, index)}
                className={`h-2 w-2 rounded-full transition ${
                  index === currentImageIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-brand-700 shadow-sm">
          Verified Property
        </span>

        <span className="absolute bottom-3 left-3 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-brand-700 shadow-sm">
          {property.category.name}
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleWishlist();
          }}
          disabled={wishlistLoading}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm transition hover:bg-white ${
            isWishlisted ? "text-red-500" : "text-ink-700"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <span className={wishlistLoading ? "animate-pulse" : ""}>
            <HeartIcon filled={isWishlisted} />
          </span>
        </button>
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
              "-"}{" "}
            Guests
          </span>

          <span className="text-ink-300">
            |
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
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
              {getPrimaryPriceLabel(property)}
            </span>

            <strong className="block text-lg font-extrabold text-ink-900">
              {formatPrice(
                property.pricing
                  .startingPrice
              )}
            </strong>

            {property.bookingType ===
              "BOTH" &&
              property.pricing.basePrice !==
                null && (
                <span className="text-[11px] text-ink-500">
                  Full stay{" "}
                  {formatPrice(
                    property.pricing.basePrice
                  )}
                </span>
              )}

            {property.bookingType !==
              "BOTH" && (
              <span className="text-[11px] text-ink-500">
                per night
              </span>
            )}
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
          onClick={(event) => event.stopPropagation()}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-brand-700 text-[12px] font-extrabold text-white transition hover:bg-brand-800"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

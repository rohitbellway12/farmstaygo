"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import PropertyCard from "@/components/property/PropertyCard";
import { apiFetch, ApiRequestError } from "@/lib/api";
import type { PublicPropertyCard } from "@/types/public";

interface WishlistResponse {
  success: boolean;
  message: string;
  data: PublicPropertyCard[];
  total: number;
}

export default function WishlistPage() {
  const [properties, setProperties] = useState<
    PublicPropertyCard[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadWishlist = async () => {
      const authData = localStorage.getItem(
        "farmstaygo_customer_auth"
      );

      if (!authData) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        JSON.parse(authData);
      } catch {
        localStorage.removeItem(
          "farmstaygo_customer_auth"
        );
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);
      setLoading(true);
      setError("");

      try {
        const response =
          await apiFetch<WishlistResponse>(
            "/wishlist"
          );

        if (!cancelled) {
          setProperties(response.data || []);
        }
      } catch (requestError) {
        if (!cancelled) {
          if (
            requestError instanceof
              ApiRequestError &&
            requestError.status === 401
          ) {
            setIsLoggedIn(false);
          }

          setError(
            requestError instanceof ApiRequestError
              ? requestError.message
              : "Unable to load wishlist."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadWishlist();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-[#f7f4ed]">
      <section className="site-container py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-4 border-b border-ink-100 pb-6 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-700">
              Saved stays
            </span>

            <h1 className="mt-2 text-3xl font-extrabold text-ink-900 sm:text-4xl">
              Wishlist
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
              Your saved farmstays, villas, resorts and
              countryside escapes in one place.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-extrabold text-white transition hover:bg-brand-800"
          >
            Explore Properties
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[390px] animate-pulse rounded-xl bg-white shadow-[0_8px_28px_rgba(27,58,39,0.08)]"
              />
            ))}
          </div>
        ) : !isLoggedIn ? (
          <section className="mt-8 rounded-2xl border border-ink-100 bg-white px-6 py-12 text-center shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
            <h2 className="text-2xl font-extrabold text-ink-900">
              Login to view your wishlist
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-600">
              Save properties while browsing and come back
              anytime to compare your favorite stays.
            </p>

            <Link
              href="/login?next=/wishlist"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800"
            >
              Login / Signup
            </Link>
          </section>
        ) : error ? (
          <section className="mt-8 rounded-2xl border border-red-100 bg-white px-6 py-10 text-center shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
            <h2 className="text-xl font-extrabold text-ink-900">
              Unable to load wishlist
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>
          </section>
        ) : properties.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-ink-100 bg-white px-6 py-12 text-center shadow-[0_8px_28px_rgba(27,58,39,0.08)]">
            <h2 className="text-2xl font-extrabold text-ink-900">
              No saved properties yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-600">
              Tap the heart on any property to save it here
              for later.
            </p>

            <Link
              href="/properties"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800"
            >
              Browse Properties
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.publicId}
                property={property}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

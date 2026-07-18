import { Suspense } from "react";

import PropertyListingClient from "@/components/property/PropertyListingClient";

function PropertyListingFallback() {
  return (
    <div className="min-h-[70vh] bg-[#f8faf8]">
      <section className="border-b border-ink-100 bg-white">
        <div className="site-container py-8">
          <div className="h-5 w-28 animate-pulse rounded bg-ink-100" />
          <div className="mt-3 h-9 w-72 animate-pulse rounded bg-ink-100" />
          <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-ink-100" />
        </div>
      </section>

      <div className="site-container grid gap-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden h-[620px] animate-pulse rounded-2xl bg-white shadow-sm lg:block" />

        <div>
          <div className="h-16 animate-pulse rounded-2xl bg-white shadow-sm" />

          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-ink-100 bg-white"
              >
                <div className="h-52 animate-pulse bg-ink-100" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-ink-100" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
                  <div className="h-10 animate-pulse rounded bg-ink-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<PropertyListingFallback />}>
      <PropertyListingClient />
    </Suspense>
  );
}

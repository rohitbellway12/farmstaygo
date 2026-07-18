import Link from "next/link";

import HomeSearchForm from "@/components/common/HomeSearchForm";
import PropertyCard from "@/components/property/PropertyCard";
import { apiFetch } from "@/lib/api";
import { getAssetUrl } from "@/lib/assets";
import type {
  PublicCategoriesResponse,
  PublicCategory,
  PublicPropertiesResponse,
  PublicPropertyCard,
} from "@/types/public";



async function getHomeData(): Promise<{
  categories: PublicCategory[];
  properties: PublicPropertyCard[];
}> {
  const [
    categoriesResult,
    featuredResult,
  ] = await Promise.allSettled([
    apiFetch<PublicCategoriesResponse>(
      "/public/property-categories"
    ),

    apiFetch<PublicPropertiesResponse>(
      "/public/properties?featured=true&limit=4"
    ),
  ]);

  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.data
      : [];

  let properties =
    featuredResult.status === "fulfilled"
      ? featuredResult.value.data
      : [];

  if (properties.length === 0) {
    try {
      const fallback =
        await apiFetch<PublicPropertiesResponse>(
          "/public/properties?limit=4&sort=RECOMMENDED"
        );

      properties = fallback.data;
    } catch {
      properties = [];
    }
  }

  return {
    categories,
    properties,
  };
}

function TrustItem({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
        {icon}
      </span>

      <span>
        <strong className="block text-[12px] font-extrabold text-ink-900">
          {title}
        </strong>

        <small className="mt-0.5 block text-[10px] text-ink-500">
          {description}
        </small>
      </span>
    </div>
  );
}

function CategoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

export default async function Home() {
  const {
    categories,
    properties,
  } = await getHomeData();

  const heroImage = getAssetUrl("/storage/hero.png");

  const heroStyle = {
    backgroundImage: heroImage
      ? `linear-gradient(90deg, rgba(4,24,12,.82) 0%, rgba(4,24,12,.56) 44%, rgba(4,24,12,.20) 100%), url("${heroImage}")`
      : "linear-gradient(135deg, #143d24 0%, #24632f 48%, #6b925f 100%)",
  };

  return (
    <>
      <section
        className="home-hero flex items-center"
        style={heroStyle}
      >
        <div className="site-container py-14 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur">
              Verified nature stays across India
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white sm:text-5xl lg:text-[60px]">
              Nature. Comfort.
              <span className="block text-[#8bd58e]">
                Memories.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              Discover the best farmhouses,
              villas and unique stays for
              weekends, celebrations and
              unforgettable vacations.
            </p>
          </div>

          <div className="mt-9">
            <HomeSearchForm />
          </div>

          <div className="mt-7 grid gap-4 text-white sm:grid-cols-2 xl:grid-cols-4">
            {[
              [
                "Best Price Guarantee",
                "Transparent pricing",
                "tag",
              ],
              [
                "Verified Properties",
                "Quality checked stays",
                "shield",
              ],
              [
                "Secure Booking",
                "Protected checkout",
                "lock",
              ],
              [
                "24/7 Customer Support",
                "Always here to help",
                "support",
              ],
            ].map(
              ([title, description, type]) => (
                <div
                  key={title}
                  className="flex items-center gap-2.5 text-[12px] font-semibold text-white/90"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/10">
                    {type === "tag" && "◇"}
                    {type === "shield" && "♢"}
                    {type === "lock" && "▣"}
                    {type === "support" && "◉"}
                  </span>

                  <span>
                    <strong className="block">
                      {title}
                    </strong>
                    <small className="text-white/55">
                      {description}
                    </small>
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="section-spacing bg-white">
        <div className="site-container">
          <div className="text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
              Find your kind of stay
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-ink-900 sm:text-3xl">
              Browse by Category
            </h2>
          </div>

          {categories.length > 0 ? (
            <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
              {categories
                .slice(0, 7)
                .map((category) => {
                  const imageUrl =
                    getAssetUrl(
                      category.image
                    );

                  return (
                    <Link
                      key={category.id}
                      href={`/properties?category=${category.slug}`}
                      className="group text-center"
                    >
                      <span className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:-translate-y-1 group-hover:bg-brand-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={category.name}
                            className="h-full w-full object-contain p-4"
                          />
                        ) : (
                          <CategoryIcon />
                        )}
                      </span>

                      <strong className="mt-3 block text-[12px] font-extrabold text-ink-800 group-hover:text-brand-700">
                        {category.name}
                      </strong>

                      <small className="mt-1 block text-[10px] text-ink-400">
                        {category.propertyCount}{" "}
                        properties
                      </small>
                    </Link>
                  );
                })}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-8 text-center text-sm text-ink-500">
              Categories will appear here after
              active categories are available.
            </div>
          )}
        </div>
      </section>

      <section
        id="featured-properties"
        className="section-spacing bg-[#fbfcfb]"
      >
        <div className="site-container">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
                Handpicked for you
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-ink-900 sm:text-3xl">
                Featured Properties
              </h2>

              <p className="mt-2 text-sm text-ink-500">
                Verified stays selected for
                comfort, location and experience.
              </p>
            </div>

            <Link
              href="/properties"
              className="hidden items-center gap-2 text-[12px] font-extrabold text-brand-700 hover:text-brand-800 sm:inline-flex"
            >
              View All Properties
              <span>→</span>
            </Link>
          </div>

          {properties.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {properties.map((property) => (
                <PropertyCard
                  key={property.publicId}
                  property={property}
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
              <h3 className="text-lg font-extrabold text-ink-900">
                Featured properties are coming
                soon
              </h3>

              <p className="mt-2 text-sm text-ink-500">
                Approve and feature properties
                from the Admin portal to show
                them here.
              </p>
            </div>
          )}

          <Link
            href="/properties"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-brand-300 bg-brand-50 text-sm font-extrabold text-brand-700 sm:hidden"
          >
            View All Properties
          </Link>
        </div>
      </section>

      <section className="section-spacing bg-white">
        <div className="site-container overflow-hidden rounded-3xl border border-brand-100 soft-grid-background">
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
                Custom stay solutions
              </p>

              <h2 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-[-0.04em] text-ink-900">
                Couldn&apos;t decide? Let our
                stay experts plan it for you.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-ink-600">
                From private parties and corporate
                outings to family staycations and
                special events, we will help you
                find the right property.
              </p>

              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  "Custom Parties",
                  "Corporate Outings",
                  "Staycations",
                  "Special Events",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-ink-100"
                  >
                    <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
                      ◇
                    </span>

                    <strong className="mt-2 block text-[11px] text-ink-800">
                      {item}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-[0_12px_36px_rgba(30,79,40,0.10)] ring-1 ring-ink-100">
              <h3 className="text-xl font-extrabold text-ink-900">
                Talk to our experts
              </h3>

              <p className="mt-2 text-sm leading-6 text-ink-500">
                Share your requirements and our
                team will help you shortlist the
                best stays.
              </p>

              <Link
                href="/contact"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-700 text-sm font-extrabold text-white hover:bg-brand-800"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="site-container grid gap-4 rounded-2xl border border-ink-100 bg-[#fffdf8] p-5 sm:grid-cols-2 xl:grid-cols-4">
          <TrustItem
            title="Handpicked Stays"
            description="Carefully selected properties"
            icon="✓"
          />

          <TrustItem
            title="Best Price Guarantee"
            description="Clear and competitive pricing"
            icon="₹"
          />

          <TrustItem
            title="Easy Booking"
            description="Simple and secure process"
            icon="▣"
          />

          <TrustItem
            title="24/7 Support"
            description="Help whenever you need it"
            icon="◉"
          />
        </div>
      </section>

      <section className="pb-16">
        <div className="site-container overflow-hidden rounded-3xl bg-[linear-gradient(110deg,#0b4b2d_0%,#17613a_50%,#779966_100%)] p-8 text-white sm:p-10">
          <div className="max-w-lg">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/65">
              Grow with FarmStayGo
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
              List Your Property
            </h2>

            <p className="mt-3 text-sm leading-7 text-white/75">
              Join hosts across India, reach more
              travellers and grow your bookings
              with an easy-to-manage Vendor portal.
            </p>

            <a
              href={`${
                process.env
                  .NEXT_PUBLIC_PORTAL_URL ||
                "http://localhost:5173"
              }/vendor/login`}
              className="mt-6 inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-extrabold text-brand-800 shadow-sm"
            >
              Become a Host
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

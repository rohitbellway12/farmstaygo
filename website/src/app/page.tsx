import Link from "next/link";
import type { Metadata } from "next";
import {
  Tag,
  ShieldCheck,
  Lock,
  Headphones,
  House,
  Castle,
  Tent,
  TreePine,
  Umbrella,
  Building2,
  Waves,
  Mountain,
  Landmark,
  Sparkles,
  Star,
  Warehouse,
} from "lucide-react";

import HomeSearchForm from "@/components/common/HomeSearchForm";
import PropertyCard from "@/components/property/PropertyCard";
import ContactForm from "./ContactForm";
import { apiFetch } from "@/lib/api";
import { getAssetUrl } from "@/lib/assets";
import { backendBaseUrl, portalUrl } from "@/lib/config";
import type {
  PublicCategoriesResponse,
  PublicCategory,
  PublicPropertiesResponse,
  PublicPropertyCard,
  PublicServiceCitiesResponse,
  PublicServiceCity,
} from "@/types/public";

export const metadata: Metadata = {
  title: "Farmhouses Near Indore | Book Farmhouses, Villas & Stays",
  description:
    "Discover and book verified farmhouses near Indore, private villas and nature stays for birthdays, parties, family outings, corporate events and weekend getaways.",
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  author: string | null;
  createdAt: string;
}



async function getHomeData(): Promise<{
  categories: PublicCategory[];
  properties: PublicPropertyCard[];
  cities: PublicServiceCity[];
  blogPosts: BlogPost[];
  homeHeroImage: string | null;
  homeGrowImage: string | null;
}> {
  const [
    categoriesResult,
    citiesResult,
    featuredResult,
    blogResult,
    homeResult,
  ] = await Promise.allSettled([
    apiFetch<PublicCategoriesResponse>(
      "/public/property-categories"
    ),

    apiFetch<PublicServiceCitiesResponse>(
      "/public/service-cities"
    ),

    apiFetch<PublicPropertiesResponse>(
      "/public/properties?featured=true&limit=4"
    ),

    apiFetch<{ success: boolean; data: BlogPost[] }>(
      "/public/blog"
    ),

    apiFetch<{
      success: boolean;
      data: {
        homeHeroImage: string | null;
        homeGrowImage: string | null;
      };
    }>("/public/settings/home"),
  ]);

  const categories =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.data
      : [];

  const cities =
    citiesResult.status === "fulfilled"
      ? citiesResult.value.data
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

  const blogPosts =
    blogResult.status === "fulfilled"
      ? blogResult.value.data
      : [];

  const homeSettings =
    homeResult.status === "fulfilled"
      ? homeResult.value.data
      : { homeHeroImage: null, homeGrowImage: null };

  return {
    categories,
    cities,
    properties,
    blogPosts,
    homeHeroImage: homeSettings.homeHeroImage,
    homeGrowImage: homeSettings.homeGrowImage,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const categoryIconMap: Record<string, React.ReactNode> = {
  farmhouse: <House className="h-8 w-8" />,
  villa: <Castle className="h-8 w-8" />,
  cottage: <House className="h-8 w-8" />,
  resort: <Umbrella className="h-8 w-8" />,
  tent: <Tent className="h-8 w-8" />,
  camping: <Tent className="h-8 w-8" />,
  treehouse: <TreePine className="h-8 w-8" />,
  homestay: <House className="h-8 w-8" />,
  guesthouse: <House className="h-8 w-8" />,
  pool: <Waves className="h-8 w-8" />,
  lake: <Waves className="h-8 w-8" />,
  mountain: <Mountain className="h-8 w-8" />,
  jungle: <TreePine className="h-8 w-8" />,
  beach: <Umbrella className="h-8 w-8" />,
  heritage: <Landmark className="h-8 w-8" />,
  luxury: <Sparkles className="h-8 w-8" />,
  boutique: <Star className="h-8 w-8" />,
  apartment: <Building2 className="h-8 w-8" />,
  cabin: <House className="h-8 w-8" />,
  warehouse: <Warehouse className="h-8 w-8" />,
};

function getCategoryIcon(slug: string, name: string) {
  return (
    categoryIconMap[slug] ||
    categoryIconMap[name.toLowerCase()] ||
    <House className="h-8 w-8" />
  );
}

export default async function Home() {
  const {
    categories,
    cities,
    properties,
    blogPosts,
    homeHeroImage,
    homeGrowImage,
  } = await getHomeData();

  const heroImage =
    homeHeroImage || getAssetUrl("/storage/hero.png");

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
            <HomeSearchForm cities={cities} />
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
                    {type === "tag" && <Tag className="h-4 w-4" />}
                    {type === "shield" && <ShieldCheck className="h-4 w-4" />}
                    {type === "lock" && <Lock className="h-4 w-4" />}
                    {type === "support" && <Headphones className="h-4 w-4" />}
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
            <h2 className="text-2xl font-extrabold tracking-[-0.035em] text-ink-900 sm:text-3xl">
              Find your kind of stay
            </h2>
          </div>

          {categories.length > 0 ? (
            <div className="mt-9 flex flex-wrap justify-center gap-4 sm:gap-5">
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
                      className="group w-[48%] text-center sm:w-[30%] md:w-[22%] lg:w-[19%] xl:w-[13%]"
                    >
                      <span className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:-translate-y-1 group-hover:bg-brand-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={category.name}
                            className="h-full w-full object-contain p-4"
                          />
                        ) : (
                          getCategoryIcon(category.slug, category.name)
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
              <span>-&gt;</span>
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
                    <span className="mx-auto flex h-9 w-9 items-center justify-center">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-700" fill="currentColor">
                        <path d="M12 2l10 10-10 10L2 12z" />
                      </svg>
                    </span>

                    <strong className="mt-2 block text-[11px] text-ink-800">
                      {item}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="site-container">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
                Our Blog
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-ink-900 sm:text-3xl">
                Latest Travel Stories
              </h2>
            </div>

            <Link
              href="/blog"
              className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg border border-ink-200 px-4 text-sm font-bold text-ink-700 transition hover:border-brand-700 hover:text-brand-700"
            >
              View All
            </Link>
          </div>

          {blogPosts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-ink-500">
                No blog posts yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {blogPosts.slice(0, 3).map((post) => (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  {post.imageUrl && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={getAssetUrl(post.imageUrl)}
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      />
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-base font-extrabold text-ink-900">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-brand-700"
                      >
                        {post.title}
                      </Link>
                    </h3>

                    {post.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-500">
                        {post.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-3 text-xs text-ink-400">
                      {post.author && (
                        <span className="font-semibold text-ink-600">
                          {post.author}
                        </span>
                      )}
                      <span className="h-1 w-1 rounded-full bg-ink-300" />
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 sm:hidden">
            <Link
              href="/blog"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 text-sm font-bold text-ink-700 transition hover:border-brand-700 hover:text-brand-700"
            >
              View All Posts
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="site-container overflow-hidden rounded-3xl bg-[linear-gradient(110deg,#0b4b2d_0%,#17613a_50%,#779966_100%)]">
          <div className="grid items-center lg:grid-cols-2">
            <div className="p-8 text-white sm:p-10 lg:p-12">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/65">
                Grow with FarmStayGo
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white">
                List Your Property
              </h2>

              <p className="mt-3 text-sm leading-7 text-white/75">
                Join hosts across India, reach more
                travellers and grow your bookings
                with an easy-to-manage Vendor portal.
              </p>

              <a
                href={`${portalUrl}/vendor/login`}
                className="mt-6 inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-extrabold text-brand-800 shadow-sm"
              >
                Become a Host
              </a>
            </div>

            <div className="relative h-64 sm:h-72 md:h-80">
              <img
                src={
                  homeGrowImage ||
                  `${backendBaseUrl}/storage/properties/cmrq2q5750001j8tzxpcddekm/pjrxtqdfgdtvc5udxgebns-1784366573062-1b02fe11.jpg`
                }
                alt="Farm stay property"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b4b2d]/60 via-[#17613a]/20 to-transparent lg:from-[30%] lg:via-transparent lg:to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="site-container">
          <div className="text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
              How It Works
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-ink-900 sm:text-3xl">
              Start Hosting in 4 Simple Steps
            </h2>

            <p className="mt-2 text-sm text-ink-500">
              From registration to your first booking, we make hosting easy.
            </p>
          </div>

          <div className="mt-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: "1",
                  title: "Register",
                  description:
                    "Create your free vendor account in minutes.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M19 8v6" />
                      <path d="M22 11h-6" />
                    </svg>
                  ),
                },
                {
                  step: "2",
                  title: "List Property",
                  description:
                    "Add photos, amenities, pricing and rules.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M9 21V9" />
                    </svg>
                  ),
                },
                {
                  step: "3",
                  title: "Get Approved",
                  description:
                    "Our team reviews and approves your listing.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m9 11 3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  ),
                },
                {
                  step: "4",
                  title: "Start Earning",
                  description:
                    "Receive bookings and grow your income.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v12" />
                      <path d="M8 10h8" />
                      <path d="M8 14h8" />
                    </svg>
                  ),
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="relative text-center"
                >
                  {index < 3 && (
                    <div className="absolute top-7 -right-3 hidden lg:block">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-300" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  )}

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    {item.icon}
                  </div>

                  <span className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-brand-700">
                    Step {item.step}
                  </span>

                  <h3 className="mt-1 text-base font-extrabold text-ink-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-ink-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`${portalUrl}/vendor/register`}
              className="inline-flex h-11 items-center rounded-lg bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800"
            >
              Get Started Now
            </a>

            <a
              href={`${portalUrl}/vendor/login`}
              className="inline-flex h-11 items-center rounded-lg border border-ink-200 px-6 text-sm font-extrabold text-ink-700 transition hover:border-brand-700 hover:text-brand-700"
            >
              Already have an account?
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

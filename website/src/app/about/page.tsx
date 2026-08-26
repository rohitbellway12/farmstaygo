import Image from "next/image";
import type { Metadata } from "next";

import { getAssetUrl } from "@/lib/assets";

export const metadata: Metadata = {
  title: "About FarmStayGo | Grow Your Farmhouse Bookings Near Indore",
  description:
    "Learn how FarmStayGo helps farmhouse and villa owners get discovered, promoted and booked while helping travellers find verified spaces near Indore.",
};

export default function AboutPage() {
  return (
    <div className="section-spacing">
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-700">
        <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_80%_-20%,rgba(205,162,59,0.15),transparent_60%)]" />
        <div className="relative site-container py-16 text-white sm:py-20 lg:py-24">
          <h1 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
            About FarmStayGo
          </h1>
          <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-white/90 sm:text-lg">
            Your farm has more to offer. We help it earn what it&apos;s worth.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
            FarmStayGo is a farmhouse, villa and event-space booking platform built around Indore — made for owners who want their property discovered, promoted and booked without lifting a finger, and for travelers who want a verified space for their next celebration or getaway.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="https://portal.farmstaygo.com/vendor/login"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50"
            >
              Start Free Listing
            </a>
            <a
              href="/properties"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/40 px-8 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              Explore Farms & Villas
            </a>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4 lg:gap-10">
            <div>
              <div className="text-2xl font-extrabold text-white sm:text-3xl">₹0</div>
              <div className="mt-1.5 text-xs text-white/70 sm:text-sm">Listing Fee</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white sm:text-3xl">200km</div>
              <div className="mt-1.5 text-xs text-white/70 sm:text-sm">Radius Around Indore</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white sm:text-3xl">6</div>
              <div className="mt-1.5 text-xs text-white/70 sm:text-sm">Host Services Included</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white sm:text-3xl">70/30</div>
              <div className="mt-1.5 text-xs text-white/70 sm:text-sm">Built Owner-First</div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="py-16 sm:py-20">
        <div className="site-container grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
              Why We Started
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-ink-900 sm:text-3xl">
              A platform built around one gap we kept seeing
            </h2>
            <p className="mt-5 text-sm leading-7 text-ink-600 sm:text-base">
              Around Indore, dozens of beautiful farmhouses and villas sit empty on weekdays while their owners struggle to find guests beyond word-of-mouth. At the same time, people planning a birthday, a kitty party, a corporate offsite, or a weekend escape were stuck scrolling unreliable listings with no way to verify what they were actually booking.
            </p>
            <p className="mt-4 text-sm leading-7 text-ink-600 sm:text-base">
              FarmStayGo exists to close that gap — by giving property owners the marketing, photography and booking support they don&apos;t have time to build themselves, and by giving guests a platform where every listing is genuinely worth trusting.
            </p>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-brand-50 p-6 sm:p-8">
            <p className="text-sm font-semibold text-ink-800">
              Our focus, in plain numbers.
            </p>
            <p className="mt-3 text-sm leading-7 text-ink-600">
              We&apos;re built primarily as a growth partner for farm and villa owners — handling the marketing, media and guest management that turns an idle property into a steady source of income. Alongside that, we curate a trustworthy, verified booking experience for travelers looking for the right space for their occasion.
            </p>
          </div>
        </div>
      </section>

      {/* FOR FARM OWNERS */}
      <section className="bg-brand-700 py-16 text-white sm:py-20">
        <div className="site-container">
          <div className="max-w-3xl">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
              For Farm & Villa Owners
            </span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              Listing with us isn&apos;t just a listing. It&apos;s a growth partnership.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">
              Most platforms give you a page and leave the rest to you. We do the opposite — we treat your property like it&apos;s ours to promote, because we only succeed when you do.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8">
            <p className="text-sm font-semibold text-white">
              No upfront cost, ever.
            </p>
            <p className="mt-2 text-sm leading-7 text-white/80">
              Listing your property with FarmStayGo is completely free. We work on a simple, pre-agreed commission on each confirmed booking — so our team is only motivated to get your property seen, booked and rebooked.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "Professional Photography & Reels",
                desc: "Our team visits your property for a professional photo and video shoot, so it's presented the way it actually deserves to be seen — not phone photos in bad lighting.",
              },
              {
                num: "02",
                title: "Dedicated Social Media Promotion",
                desc: "Your property gets featured across FarmStayGo's Instagram and Facebook with dedicated reels and posts, not just buried in a directory listing.",
              },
              {
                num: "03",
                title: "SEO-Optimized Listing Page",
                desc: "Every property gets its own search-optimized page, written to show up when travelers search things like \"farmhouse near Indore\" or \"villa for birthday party.\"",
              },
              {
                num: "04",
                title: "Guest Communication & Booking Support",
                desc: "We handle inbound enquiries, availability checks and booking coordination end-to-end, so you're not fielding calls and messages all day.",
              },
              {
                num: "05",
                title: "Verified Host Badge",
                desc: "Properties that pass our on-ground quality check earn a \"Verified by FarmStayGo\" badge — building instant trust with guests and improving conversion.",
              },
              {
                num: "06",
                title: "Seasonal Promotion & Ad Boosts",
                desc: "Top-performing properties get featured placement on our homepage and paid ad promotion during peak weekends, festive season and event months.",
              },
            ].map((service) => (
              <div
                key={service.num}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/25 hover:bg-white/10"
              >
                <span className="text-xs font-extrabold text-white/60">
                  {service.num}
                </span>
                <h3 className="mt-2 text-base font-extrabold text-white">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-white/80">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="https://portal.farmstaygo.com/vendor/login"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50"
            >
              Start Free Listing
            </a>
            <a
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/40 px-8 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              Talk to Our Team
            </a>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 sm:py-20">
        <div className="site-container">
          <div className="max-w-3xl">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
              How It Works
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-ink-900 sm:text-3xl">
              From an idle property to a booked one, in three steps
            </h2>
            <p className="mt-3 text-sm text-ink-600 sm:text-base">
              No paperwork headaches, no upfront investment. Just three steps to get your property in front of real guests.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                num: "01",
                title: "List your property, free",
                desc: "Share your property details with our team in a quick call or form — no fees, no commitment required to get started.",
              },
              {
                num: "02",
                title: "We shoot, write & promote it",
                desc: "Our team schedules a photoshoot, writes your SEO listing page, and starts featuring your property across our channels.",
              },
              {
                num: "03",
                title: "You host, we manage, you earn",
                desc: "We route enquiries and bookings to you, handle the coordination, and you earn from every guest — we only take our commission when you do.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <span className="text-xs font-extrabold text-brand-700">
                  {step.num}
                </span>
                <h3 className="mt-2 text-base font-extrabold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-ink-600">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR TRAVELERS */}
      <section className="bg-brand-50 py-16 sm:py-20">
        <div className="site-container grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="rounded-2xl bg-brand-700 p-6 text-white sm:p-8">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
              Verified Bookings
            </span>
            <h3 className="mt-2 text-xl font-extrabold text-white">
              Book with confidence, every time
            </h3>
            <p className="mt-2 text-sm leading-7 text-white/80">
              Every property on FarmStayGo is checked for accuracy before it goes live — what you see is what you get, whether it&apos;s a family weekend or a 50-person corporate offsite.
            </p>
            <a
              href="/properties"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-white px-6 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50"
            >
              Explore Farms & Villas
            </a>
          </div>
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-700">
              For Travelers
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Find the right space for your next celebration
            </h2>
            <p className="mt-3 text-sm leading-7 text-ink-600 sm:text-base">
              Whether it&apos;s a kitty party, a birthday, a corporate offsite or a weekend escape with family — we help you find and book a space that actually matches what you saw online.
            </p>
            <ul className="mt-6 space-y-4">
              <li className="flex gap-3 text-sm text-ink-700">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-700" />
                Verified listings with real, professionally shot photos
              </li>
              <li className="flex gap-3 text-sm text-ink-700">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-700" />
                Direct support from our team for every booking
              </li>
              <li className="flex gap-3 text-sm text-ink-700">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-700" />
                Properties curated for events, not just stays
              </li>
              <li className="flex gap-3 text-sm text-ink-700">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-700" />
                Local to Indore — we know these properties personally
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-ink-100 py-12 sm:py-16">
        <div className="site-container grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
          <div>
            <div className="text-3xl font-extrabold text-ink-900 sm:text-4xl">7+</div>
            <div className="mt-2 text-xs text-ink-600 sm:text-sm">
              Verified Properties Onboarded
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink-900 sm:text-4xl">200km</div>
            <div className="mt-2 text-xs text-ink-600 sm:text-sm">
              Coverage Radius From Indore
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink-900 sm:text-4xl">₹0</div>
            <div className="mt-2 text-xs text-ink-600 sm:text-sm">
              Cost to List Your Property
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-ink-900 sm:text-4xl">6</div>
            <div className="mt-2 text-xs text-ink-600 sm:text-sm">
              Growth Services for Owners
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden bg-brand-700 py-14 text-center text-white sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(500px_250px_at_20%_10%,rgba(205,162,59,0.15),transparent_60%)]" />
        <div className="relative site-container">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
            Get Started
          </span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
            Have a farmhouse, villa or event space near Indore?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            List it free, let our team handle the photography, promotion and bookings — and start earning from a property that&apos;s sitting idle right now.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://portal.farmstaygo.com/vendor/login"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50"
            >
              Start Free Listing
            </a>
            <a
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/40 px-8 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              Talk to Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import BrandLogo from "../common/BrandLogo";

const navigation = [
  { label: "Home", href: "/" },
  {
    label: "Farmhouses",
    href: "/properties?category=farmhouse",
  },
  {
    label: "Villas",
    href: "/properties?category=villa",
  },
  {
    label: "Resorts",
    href: "/properties?category=resort",
  },
  {
    label: "Destinations",
    href: "/properties",
  },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const portalUrl =
    process.env.NEXT_PUBLIC_PORTAL_URL ||
    "http://localhost:5173";

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 shadow-[0_4px_18px_rgba(22,52,35,0.06)] backdrop-blur">
      <div className="site-container flex h-[72px] items-center gap-6">
        <BrandLogo />

        <nav className="ml-auto hidden items-center gap-6 xl:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-semibold text-ink-700 transition hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 xl:ml-2 xl:flex">
          <Link
            href="/wishlist"
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
            </svg>
            Wishlist
          </Link>

          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-lg border border-ink-300 bg-white px-4 text-[13px] font-bold text-ink-800 transition hover:border-brand-500 hover:text-brand-700"
          >
            Login / Signup
          </Link>

          <a
            href={`${portalUrl}/vendor/login`}
            className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-800"
          >
            Become a Host
          </a>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen((value) => !value)
          }
          className="ml-auto grid h-10 w-10 place-items-center rounded-lg border border-ink-200 text-ink-700 xl:hidden"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {mobileOpen ? (
              <>
                <path d="m6 6 12 12" />
                <path d="M18 6 6 18" />
              </>
            ) : (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-100 bg-white px-4 py-4 xl:hidden">
          <nav className="site-container grid gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-4">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-ink-300 text-sm font-bold text-ink-800"
              >
                Login / Signup
              </Link>

              <a
                href={`${portalUrl}/vendor/login`}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white"
              >
                Become a Host
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

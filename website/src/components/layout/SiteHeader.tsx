"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import BrandLogo from "../common/BrandLogo";

const navigation = [
  { label: "Home", href: "/" },
  { label: "All Stays", href: "/properties" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Help", href: "/contact" },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem("farmstaygo_customer_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed?.data?.user) {
            setIsLoggedIn(true);
            const firstName = parsed.data.user.firstName;
            const lastName = parsed.data.user.lastName;
            setCustomerName([firstName, lastName].filter(Boolean).join(" ") || "Account");
            return;
          }
        } catch {
          localStorage.removeItem("farmstaygo_customer_auth");
        }
      }
      setIsLoggedIn(false);
      setCustomerName("");
    };

    checkAuth();

    const handleAuthChange = () => checkAuth();
    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    const handleFocus = () => checkAuth();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const portalUrl =
    process.env.NEXT_PUBLIC_PORTAL_URL ||
    "http://localhost:5173";

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 shadow-[0_8px_28px_rgba(23,35,27,0.07)] backdrop-blur">
      <div className="site-container flex h-[76px] items-center gap-5">
        <BrandLogo />

        <nav className="ml-auto hidden items-center rounded-full border border-ink-100 bg-ink-50/70 p-1 xl:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-[13px] font-bold text-ink-600 transition hover:bg-white hover:text-brand-700 hover:shadow-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Link
            href="/wishlist"
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13px] font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
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

          {isLoggedIn ? (
            <span className="inline-flex h-10 max-w-[150px] items-center truncate rounded-full border border-ink-200 bg-white px-4 text-[13px] font-bold text-ink-800 shadow-sm">
              Hi, {customerName}
            </span>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full border border-ink-200 bg-white px-4 text-[13px] font-bold text-ink-800 shadow-sm transition hover:border-brand-500 hover:text-brand-700"
            >
              Login
            </Link>
          )}

          <a
            href={`${portalUrl}/vendor/login`}
            className="inline-flex h-10 items-center rounded-full bg-brand-700 px-5 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(36,99,47,0.20)] transition hover:bg-brand-800"
          >
            Become a Host
          </a>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen((value) => !value)
          }
          className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-sm xl:hidden"
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
        <div className="border-t border-ink-100 bg-white px-4 py-4 shadow-[0_18px_30px_rgba(23,35,27,0.08)] xl:hidden">
          <nav className="site-container grid gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/wishlist"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
            >
              Wishlist
            </Link>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-4">
              {isLoggedIn ? (
                <span className="inline-flex h-11 items-center justify-center truncate rounded-full border border-ink-200 px-4 text-sm font-bold text-ink-800">
                  Hi, {customerName}
                </span>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-ink-200 text-sm font-bold text-ink-800"
                >
                  Login
                </Link>
              )}

              <a
                href={`${portalUrl}/vendor/login`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand-700 px-4 text-sm font-extrabold text-white"
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

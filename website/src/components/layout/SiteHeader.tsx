"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import BrandLogo from "../common/BrandLogo";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Stays", href: "/properties" },
  { label: "Blog", href: "/blog" },
  { label: "Wishlist", href: "/wishlist" },
];

export default function SiteHeader() {
  const router = useRouter();

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

  const handleLogout = () => {
    localStorage.removeItem("farmstaygo_customer_auth");
    window.dispatchEvent(new Event("auth-change"));
    setIsLoggedIn(false);
    setCustomerName("");
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 shadow-[0_8px_28px_rgba(23,35,27,0.07)] backdrop-blur">
      <div className="site-container flex h-[72px] items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center">
          <BrandLogo />
        </div>

        <nav className="hidden items-center rounded-full border border-ink-100 bg-ink-50/70 p-1 lg:flex">
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

        <div className="hidden flex-1 items-center justify-end gap-2 lg:flex">
          {isLoggedIn && (
            <Link
              href="/bookings"
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
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="16"
                  rx="2"
                />
                <path d="M8 3v4" />
                <path d="M16 3v4" />
                <path d="M3 10h18" />
              </svg>
              My Bookings
            </Link>
          )}

          {isLoggedIn ? (
            <>
              <span className="inline-flex h-10 max-w-[150px] items-center truncate rounded-full border border-ink-200 bg-white px-4 text-[13px] font-bold text-ink-800 shadow-sm">
                Hi, {customerName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-10 items-center rounded-full border border-red-200 bg-white px-4 text-[13px] font-bold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
              >
                Logout
              </button>
            </>
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
            className="inline-flex h-10 items-center rounded-full bg-brand-700 px-4 text-[13px] font-extrabold text-white shadow-[0_8px_18px_rgba(36,99,47,0.20)] transition hover:bg-brand-800"
          >
            Host
          </a>
        </div>

        <button
          type="button"
          onClick={() =>
            setMobileOpen((value) => !value)
          }
          className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-sm lg:hidden"
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
        <div className="border-t border-ink-100 bg-white px-4 py-4 shadow-[0_18px_30px_rgba(23,35,27,0.08)] lg:hidden">
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

            {isLoggedIn && (
              <Link
                href="/bookings"
                onClick={() =>
                  setMobileOpen(false)
                }
                className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              >
                My Bookings
              </Link>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-4">
              {isLoggedIn ? (
                <>
                  <span className="inline-flex h-11 items-center justify-center truncate rounded-full border border-ink-200 px-4 text-sm font-bold text-ink-800">
                    Hi, {customerName}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-red-200 px-4 text-sm font-bold text-red-700"
                  >
                    Logout
                  </button>
                </>
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
                Host Login
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

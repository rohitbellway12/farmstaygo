"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import BrandLogo from "../common/BrandLogo";
import { apiFetch } from "@/lib/api";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Stays", href: "/properties" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Support", href: "/support" },
];

export default function SiteHeader() {
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);

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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await apiFetch<{
          success: boolean;
          data: {
            siteLogoUrl: string | null;
          };
        }>("/public/settings/platform");

        if (data?.success && data?.data) {
          setSiteLogoUrl(data.data.siteLogoUrl);
        }
      } catch {
        // keep defaults
      }
    };

    void loadSettings();
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [router]);

  useEffect(() => {
    if (!profileOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

  const portalUrl =
    process.env.NEXT_PUBLIC_PORTAL_URL ||
    "http://localhost:5173";

  const handleLogout = () => {
    localStorage.removeItem("farmstaygo_customer_auth");
    window.dispatchEvent(new Event("auth-change"));
    setIsLoggedIn(false);
    setCustomerName("");
    setMobileOpen(false);
    setProfileOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/95 shadow-[0_8px_28px_rgba(23,35,27,0.07)] backdrop-blur">
      <div className="site-container flex h-[72px] items-center gap-4">
        <div className="flex min-w-0 flex-1 items-center">
          <BrandLogo logoUrl={siteLogoUrl} />
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
          {isLoggedIn ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-200 bg-white px-3 text-[13px] font-bold text-ink-800 shadow-sm transition hover:border-brand-500 hover:text-brand-700"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="max-w-[120px] truncate">
                  {customerName}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3.5 w-3.5 text-ink-500 transition ${profileOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[110%] w-56 rounded-2xl border border-ink-100 bg-white py-2 shadow-[0_18px_40px_rgba(23,35,27,0.12)]">
                  <div className="border-b border-ink-100 px-4 py-3">
                    <p className="text-sm font-extrabold text-ink-900">
                      {customerName}
                    </p>
                    <p className="text-xs text-ink-500">
                      Customer Account
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/account"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      My Profile
                    </Link>

                    <Link
                      href="/bookings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
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

                    <Link
                      href="/wishlist"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      My Wishlist
                    </Link>

                    <Link
                      href="/support"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                      </svg>
                      Support
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        window.location.href = "/support/my-tickets";
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M8 3v4" />
                        <path d="M16 3v4" />
                        <path d="M3 10h18" />
                      </svg>
                      My Tickets
                    </button>
                  </div>

                  <div className="border-t border-ink-100 py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              <>
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  My Profile
                </Link>
                <Link
                  href="/bookings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  My Bookings
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  My Wishlist
                </Link>
              <Link
                href="/support"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              >
                Support
              </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    window.location.href = "/support/my-tickets";
                  }}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  My Tickets
                </button>
              </>
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

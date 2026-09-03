import Link from "next/link";

import BrandLogo from "../common/BrandLogo";
import { apiFetch } from "@/lib/api";
import { apiBaseUrl } from "@/lib/config";

import type {
  PublicCmsPage,
  PublicCmsPagesResponse,
  PublicContactInfo,
  PublicContactInfoResponse,
} from "@/types/public";

function SocialIcon({ platform }: { platform: string }) {
  const normalizedPlatform = platform.trim().toLowerCase();

  // Facebook
  if (normalizedPlatform.includes("facebook")) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M13.5 22v-8h2.75l.5-3H13.5V9.05c0-.87.43-1.55 1.67-1.55h1.75V4.82c-.3-.04-1.33-.14-2.53-.14-2.5 0-4.2 1.53-4.2 4.34V11H7.5v3h2.69v8h3.31Z" />
      </svg>
    );
  }

  // Instagram
  if (normalizedPlatform.includes("instagram")) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle
          cx="17.5"
          cy="6.5"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  }

  // WhatsApp
  if (
    normalizedPlatform.includes("whatsapp") ||
    normalizedPlatform.includes("whats app")
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.52 3.48A11.84 11.84 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.58 5.96L.05 24l6.26-1.64a11.9 11.9 0 0 0 5.77 1.47h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.19-3.5-8.42ZM12.09 21.7h-.01a9.78 9.78 0 0 1-4.99-1.36l-.36-.21-3.72.98.99-3.63-.23-.37a9.77 9.77 0 0 1-1.5-5.18c0-5.39 4.39-9.78 9.79-9.78 2.61 0 5.07 1.02 6.92 2.87a9.73 9.73 0 0 1 2.86 6.92c0 5.4-4.39 9.78-9.78 9.78Zm5.36-7.33c-.29-.15-1.7-.84-1.96-.94-.26-.1-.45-.15-.64.15-.19.29-.73.94-.89 1.13-.16.19-.33.22-.61.07-.29-.15-1.21-.45-2.31-1.43-.85-.76-1.43-1.69-1.6-1.98-.17-.29-.02-.45.13-.6.13-.13.29-.33.43-.49.15-.16.19-.28.29-.47.1-.19.05-.35-.02-.49-.07-.15-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.49.07-.75.35-.26.29-.98.96-.98 2.34s1.01 2.71 1.15 2.9c.14.19 1.98 3.02 4.8 4.24.67.29 1.2.46 1.61.59.68.22 1.3.19 1.79.12.55-.08 1.7-.7 1.94-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.34Z" />
      </svg>
    );
  }

  return null;
}

async function getFooterPages(): Promise<PublicCmsPage[]> {
  try {
    const response =
      await apiFetch<PublicCmsPagesResponse>("/public/cms-pages");

    return response.data.filter((page) => page.showInFooter);
  } catch {
    return [];
  }
}

async function getContactInfo(): Promise<PublicContactInfo> {
  try {
    const response =
      await apiFetch<PublicContactInfoResponse>("/contact/info");

    return response.data;
  } catch {
    return {
      email: null,
      phone: null,
      socialLinks: [],
    };
  }
}

async function getPublicPlatformSettings() {
  try {
    const response = await fetch(
      `${apiBaseUrl}/public/settings/platform`
    );

    if (!response.ok) {
      return {
        siteLogoUrl: null,
      };
    }

    const data = await response.json();

    let logoUrl = data?.data?.siteLogoUrl || null;

    if (
      logoUrl &&
      !logoUrl.includes("localhost") &&
      !logoUrl.includes("127.0.0.1") &&
      logoUrl.startsWith("http:")
    ) {
      logoUrl = logoUrl.replace("http:", "https:");
    }

    return {
      siteLogoUrl: logoUrl,
    };
  } catch {
    return {
      siteLogoUrl: null,
    };
  }
}

export default async function SiteFooter() {
  const [footerPages, contactInfo, platformSettings] =
    await Promise.all([
      getFooterPages(),
      getContactInfo(),
      getPublicPlatformSettings(),
    ]);

  const companyLinks = footerPages.filter(
    (page) => page.footerGroup === "company"
  );

  const policyLinks = footerPages.filter(
    (page) => page.footerGroup === "policies"
  );

  return (
    <footer className="bg-[#132916] text-white">
      <div className="site-container py-16">

        {/* Main Footer */}
        <div
          className="
            grid
            grid-cols-1
            gap-12
            md:grid-cols-2
            lg:grid-cols-[1.2fr_1fr_1fr_1.2fr]
            xl:grid-cols-[420px_180px_180px_320px]
          "
        >

          {/* About / Logo */}
          <div>
            <div className="mb-8">
              <BrandLogo
                light
                logoUrl={platformSettings.siteLogoUrl}
              />
            </div>

            <p className="max-w-[360px] text-[16px] leading-10 text-white/80">
              FarmStayGo is Indore&apos;s curated booking platform for
              farmhouses, villas, and event venues within 200km of the
              city. From birthday celebrations and kitty parties to
              corporate offsites and weekend getaways, we connect you
              directly with verified hosts for a stay that feels like
              home, away from home.
            </p>

            {/* Social Links */}
            {contactInfo.socialLinks.length > 0 && (
              <div className="mt-10 flex gap-4">
                {contactInfo.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.platform}
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/20
                      text-white/70
                      transition-all
                      duration-300
                      hover:border-white/40
                      hover:bg-white/10
                      hover:text-white
                    "
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Explore */}
          <div>
            <h3 className="mb-7 text-[22px] font-bold">
              Explore
            </h3>

            <ul className="space-y-5">
              {companyLinks.map((page) => (
                <li key={page.id}>
                  <Link
                    href={`/pages/${page.slug}`}
                    className="
                      text-[16px]
                      text-white/75
                      transition
                      hover:text-white
                    "
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-7 text-[22px] font-bold">
              Legal
            </h3>

            <ul className="space-y-5">
              {policyLinks.map((page) => (
                <li key={page.id}>
                  <Link
                    href={`/pages/${page.slug}`}
                    className="
                      text-[16px]
                      text-white/75
                      transition
                      hover:text-white
                    "
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-7 text-[22px] font-bold">
              Get in Touch
            </h3>

            <div className="space-y-6 text-[16px] text-white/75">

              <p>
                📍 Indore, Madhya Pradesh, India
              </p>

              {contactInfo.email && (
                <p>
                  ✉️ {contactInfo.email}
                </p>
              )}

              {contactInfo.phone && (
                <p>
                  📞 {contactInfo.phone}
                </p>
              )}

            </div>

            {/* Newsletter */}
            <div className="mt-8 lg:mt-10">
              <p className="mb-4 text-[15px] text-white/55">
                Get new stays &amp; offers in your inbox
              </p>

              <form
                action="/api/newsletter"
                method="POST"
                className="
                  flex
                  w-full
                  max-w-full
                  flex-col
                  gap-2
                  sm:flex-row
                "
              >
                <input
                  type="email"
                  name="email"
                  placeholder="Your email address"
                  required
                  className="
                    w-full
                    max-w-full
                    rounded-xl
                    border
                    border-white/10
                    bg-[#1a341d]
                    px-4
                    py-3
                    text-[15px]
                    text-white
                    placeholder:text-white/40
                    focus:border-brand-400
                    focus:outline-none
                    sm:flex-1
                  "
                />

                <button
                  type="submit"
                  className="
                    w-full
                    max-w-full
                    rounded-xl
                    bg-[#d7a63a]
                    px-6
                    py-3
                    text-base
                    font-bold
                    text-black
                    transition
                    hover:opacity-90
                    sm:w-auto
                    sm:flex-shrink-0
                  "
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-20 border-t border-white/10 pt-10">
          <div
            className="
              flex
              flex-col
              gap-3
              text-[15px]
              text-white/60
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <p>
              © 2026 FarmStayGo. All rights reserved.
            </p>

            <p className="text-[13px] text-white/50">
              Designed &amp; Developed by{" "}
              <a
                href="https://bellwayinfotech.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  text-white/70
                  transition
                  hover:text-white
                "
              >
                Bellway Infotech
              </a>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}
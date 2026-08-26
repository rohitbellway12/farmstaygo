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
  const iconPath = platform.toLowerCase().includes("facebook")
    ? "M22.675 0h-21.35C.596 0 0 .59 0 1.326v21.348C0 23.41.595 24 1.326 24h11.495v-9.294H9.692V11.01h3.129V8.414c0-3.1 1.894-4.788 4.66-4.788 1.34 0 2.48.992 2.48 2.477v4.12h-2.479c-1.326 0-1.857.687-1.857 1.823v2.378h3.874l-.501 2.704h-3.37v9.294C23.406 24 24 23.41 24 22.674V1.326C24 .59 23.405 0 22.675 0z"
    : platform.toLowerCase().includes("instagram")
    ? "M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.81.33 4 .58c-.87.27-1.65.65-2.42 1.42S.35 3.13.08 4C-.17 4.81-.37 5.78-.43 7.05C-.01 8.33 0 8.74 0 12s-.01 3.66.07 4.95c.06 1.17.25 1.87.43 2.33.22.66.48 1.11.91 1.56.43.43.85.71 1.42.91.43.17 1.06.38 2.23.43 1.26.06 1.64.07 4.84.07s3.58-.01 4.84-.07c1.17-.05 1.8-.25 2.23-.43.57-.22 1.11-.48 1.56-.91.43-.43.71-.85.91-1.42.17-.43.38-1.06.43-2.23.06-1.26.07-1.63.07-4.84s-.01-3.58-.07-4.84c-.05-1.17-.25-1.8-.43-2.23-.22-.66-.48-1.11-.91-1.56-.43-.43-.85-.71-1.42-.91-.43-.17-1.06-.38-2.23-.43C15.66.01 15.26 0 12 0z"
    : "M20.52 3.48A11.82 11.82 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.18 1.6 6L0 24l6.17-1.57A12 12 0 1 0 20.52 3.48Z";

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d={iconPath} />
    </svg>
  );
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
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr] xl:grid-cols-[420px_180px_180px_320px]">
          <div>
            <div className="mb-8">
              <BrandLogo
                light
                logoUrl={platformSettings.siteLogoUrl}
              />
            </div>

            <p className="max-w-[360px] text-[16px] leading-10 text-white/80">
              FarmStayGo is Indore's curated booking platform for
              farmhouses, villas, and event venues within 200km of the
              city. From birthday celebrations and kitty parties to
              corporate offsites and weekend getaways, we connect you
              directly with verified hosts for a stay that feels like
              home, away from home.
            </p>

            {contactInfo.socialLinks.length > 0 && (
              <div className="mt-10 flex gap-4">
                {contactInfo.socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/70 transition duration-300 hover:text-white"
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-7 text-[22px] font-bold">
              Explore
            </h3>

            <ul className="space-y-5">
              {companyLinks.map((page) => (
                <li key={page.id}>
                  <Link
                    href={`/pages/${page.slug}`}
                    className="text-[16px] text-white/75 transition hover:text-white"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-7 text-[22px] font-bold">
              Legal
            </h3>

            <ul className="space-y-5">
              {policyLinks.map((page) => (
                <li key={page.id}>
                  <Link
                    href={`/pages/${page.slug}`}
                    className="text-[16px] text-white/75 transition hover:text-white"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-7 text-[22px] font-bold">
              Get in Touch
            </h3>

            <div className="space-y-6 text-[16px] text-white/75">
              <p>📍 Indore, Madhya Pradesh, India</p>

              {contactInfo.email && (
                <p>✉️ {contactInfo.email}</p>
              )}

              {contactInfo.phone && (
                <p>📞 {contactInfo.phone}</p>
              )}
            </div>

            <div className="mt-8 lg:mt-10">
              <p className="mb-4 text-[15px] text-white/55">
                Get new stays & offers in your inbox
              </p>

              <form
                action="/api/newsletter"
                method="POST"
                className="flex w-full max-w-full flex-col gap-2 sm:flex-row"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="Your email address"
                  className="w-full max-w-full rounded-xl border border-white/10 bg-[#1a341d] px-4 py-3 text-[15px] text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none sm:flex-1"
                />

                <button
                  type="submit"
                  className="w-full max-w-full rounded-xl bg-[#d7a63a] px-6 py-3 text-base font-bold text-black transition hover:opacity-90 sm:w-auto sm:flex-shrink-0"
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-20 border-t border-white/10 pt-10">
          <div className="flex flex-col gap-3 text-[15px] text-white/60 lg:flex-row lg:items-center lg:justify-between">
            <p>© 2026 FarmStayGo. All rights reserved.</p>

            <p className="text-[13px] text-white/50">
              Designed &amp; Developed by{" "}
              <a
                href="https://bellwayinfotech.com/"
                target="_blank"
                rel="noreferrer"
                className="text-white/70 transition hover:text-white"
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
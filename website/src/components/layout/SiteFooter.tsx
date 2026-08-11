import Link from "next/link";

import BrandLogo from "../common/BrandLogo";
import { apiFetch } from "@/lib/api";
import type {
  PublicCmsPage,
  PublicCmsPagesResponse,
  PublicContactInfo,
  PublicContactInfoResponse,
} from "@/types/public";

const hostLinks = [
  ["Host Login", "http://localhost:5173/vendor/login"],
  ["List Your Property", "http://localhost:5173/vendor/register"],
];

const groupLabels: Record<string, string> = {
  company: "Company",
  policies: "Policies",
  support: "Support",
};

function SocialIcon({ platform }: { platform: string }) {
  const iconPath = platform.toLowerCase().includes("facebook")
    ? "M22.675 0h-21.35C.596 0 0 .59 0 1.326v21.348C0 23.41.595 24 1.326 24h11.495v-9.294H9.692V11.01h3.129V8.414c0-3.1 1.894-4.788 4.66-4.788 1.34 0 2.48.992 2.48 2.477v4.12h-2.479c-1.326 0-1.857.687-1.857 1.823v2.378h3.874l-.501 2.704h-3.37v9.294C23.406 24 24 23.41 24 22.674V1.326C24 .59 23.405 0 22.675 0z"
    : platform.toLowerCase().includes("instagram")
      ? "M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.81.33 4 .58c-.87.27-1.65.65-2.42 1.42S.35 3.13.08 4C-.17 4.81-.37 5.78-.43 7.05C-.01 8.33 0 8.74 0 12s-.01 3.66.07 4.95c.06 1.17.25 1.87.43 2.33.22.66.48 1.11.91 1.56.43.43.85.71 1.42.91.43.17 1.06.38 2.23.43 1.26.06 1.64.07 4.84.07s3.58-.01 4.84-.07c1.17-.05 1.8-.25 2.23-.43.57-.22 1.11-.48 1.56-.91.43-.43.71-.85.91-1.42.17-.43.38-1.06.43-2.23.06-1.26.07-1.63.07-4.84s-.01-3.58-.07-4.84c-.05-1.17-.25-1.8-.43-2.23-.22-.66-.48-1.11-.91-1.56-.43-.43-.85-.71-1.42-.91-.43-.17-1.06-.38-2.23-.43C15.66.01 15.26 0 12 0zm0 5.83a6.17 6.17 0 1 1 0 12.34 6.17 6.17 0 0 1 0-12.34zm0 10.24a4.07 4.07 0 1 0 0-8.14 4.07 4.07 0 0 0 0 8.14zm6.39-12.37a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"
      : platform.toLowerCase().includes("youtube")
        ? "M19.63 3.5C18.5 3.07 16.56 3 12 3s-6.5.07-7.63.54C3.24 4.04 2.5 4.78 2.5 5.75v12.5c0 .97.74 1.7 1.87 2.19C5.5 20.93 7.44 21 12 21s6.5-.07 7.63-.54c1.13-.49 1.87-1.23 1.87-2.2V5.75c0-.97-.74-1.7-1.87-2.25zM10 8v8l7-4z"
        : "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67h-3.56V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.42 2.42 0 1 1 0-4.83 2.42 2.42 0 0 1 0 4.83z";

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d={iconPath} />
    </svg>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-white/90">
        {title}
      </h2>

      <div className="mt-4 grid gap-2.5">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="w-fit text-[13px] font-semibold text-white/62 transition hover:text-brand-100"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
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
    const response = await apiFetch<PublicContactInfoResponse>("/contact/info");

    return response.data;
  } catch {
    return {
      email: null,
      phone: null,
      socialLinks: [],
    };
  }
}

async function getPublicPlatformSettings(): Promise<{
  siteLogoUrl: string | null;
  siteName: string;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const response = await fetch(`${baseUrl}/public/settings/platform`);

    if (!response.ok) {
      return { siteLogoUrl: null, siteName: "" };
    }

    const data = await response.json();

    if (data?.success && data?.data) {
      return {
        siteLogoUrl: data.data.siteLogoUrl,
        siteName: data.data.siteName || "",
      };
    }
  } catch {
    // keep defaults
  }

  return { siteLogoUrl: null, siteName: "" };
}

export default async function SiteFooter() {
  const [footerPages, contactInfo, platformSettings] = await Promise.all([
    getFooterPages(),
    getContactInfo(),
    getPublicPlatformSettings(),
  ]);

  const pageGroups = ["company", "policies", "support"]
    .map((group) => ({
      group,
      links: footerPages
        .filter((page) => page.footerGroup === group)
        .map((page) => [page.title, `/pages/${page.slug}`]),
    }))
    .filter((groupData) => groupData.links.length > 0);

  const hasContactInfo =
    contactInfo.email ||
    contactInfo.phone ||
    contactInfo.socialLinks.length > 0;

  return (
    <footer className="mt-auto bg-[#062f22] text-white">
      <div className="border-b border-white/10">
        <div className="site-container py-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <BrandLogo
                light
                logoUrl={platformSettings.siteLogoUrl}
              />

              <p className="mt-4 max-w-sm text-[14px] leading-7 text-white/68">
                Discover verified farmhouses, villas, resorts and peaceful
                nature stays for easy weekend bookings.
              </p>

              {hasContactInfo && (
                <div className="mt-6 space-y-2">
                  {contactInfo.email && (
                    <p className="flex items-center gap-2 text-[13px] text-white/76">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      {contactInfo.email}
                    </p>
                  )}
                  {contactInfo.phone && (
                    <p className="flex items-center gap-2 text-[13px] text-white/76">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.14.93.36 1.84.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.97.34 1.88.56 2.81.7a2 2 0 0 1 1.72 2z" />
                      </svg>
                      {contactInfo.phone}
                    </p>
                  )}
                </div>
              )}

              {contactInfo.socialLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {contactInfo.socialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
                      title={link.platform}
                    >
                      <SocialIcon platform={link.platform} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:justify-items-end">
              {pageGroups.map((groupData) => (
                <FooterColumn
                  key={groupData.group}
                  title={groupLabels[groupData.group]}
                  links={groupData.links}
                />
              ))}

              <FooterColumn title="For Hosts" links={hostLinks} />
            </div>
          </div>
        </div>
      </div>

      <div className="site-container flex flex-col gap-2 py-4 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
        <span>Copyright 2026 FarmStayGo. All rights reserved.</span>

        <span>Secure stays. Verified hosts. Real memories.</span>
      </div>
    </footer>
  );
}

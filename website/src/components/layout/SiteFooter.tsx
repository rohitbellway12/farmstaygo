import Link from "next/link";

import BrandLogo from "../common/BrandLogo";
import { apiFetch } from "@/lib/api";
import type {
  PublicCmsPage,
  PublicCmsPagesResponse,
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

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: string[][];
}) {
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
      await apiFetch<PublicCmsPagesResponse>(
        "/public/cms-pages"
      );

    return response.data.filter(
      (page) => page.showInFooter
    );
  } catch {
    return [];
  }
}

export default async function SiteFooter() {
  const footerPages = await getFooterPages();

  const pageGroups = ["company", "policies", "support"]
    .map((group) => ({
      group,
      links: footerPages
        .filter((page) => page.footerGroup === group)
        .map((page) => [
          page.title,
          `/pages/${page.slug}`,
        ]),
    }))
    .filter((groupData) => groupData.links.length > 0);

  return (
    <footer className="mt-auto bg-[#062f22] text-white">
      <div className="border-b border-white/10">
        <div className="site-container grid gap-10 py-12 lg:grid-cols-[1.25fr_2fr] lg:gap-14">
          <div>
            <BrandLogo light />

            <p className="mt-5 max-w-sm text-[14px] leading-7 text-white/68">
              Discover verified farmhouses, villas,
              resorts and peaceful nature stays for
              easy weekend bookings.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {["Facebook", "Instagram", "YouTube", "LinkedIn"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-extrabold text-white/76"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {pageGroups.map((groupData) => (
              <FooterColumn
                key={groupData.group}
                title={groupLabels[groupData.group]}
                links={groupData.links}
              />
            ))}

            <FooterColumn
              title="For Hosts"
              links={hostLinks}
            />

            <div className="sm:col-span-2 xl:col-span-1">
              <h2 className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-white/90">
                Newsletter
              </h2>

              <p className="mt-4 text-[13px] leading-6 text-white/62">
                Get stay ideas, offers and new
                destination updates.
              </p>

              <form className="mt-4 flex rounded-[8px] border border-white/12 bg-white p-1">
                <input
                  type="email"
                  placeholder="Email address"
                  className="h-10 min-w-0 flex-1 rounded-md px-3 text-[13px] text-ink-900 outline-none placeholder:text-ink-400"
                />

                <button
                  type="submit"
                  className="h-10 rounded-md bg-brand-700 px-4 text-[12px] font-extrabold text-white transition hover:bg-brand-800"
                >
                  Subscribe
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-white/56">
                <span>Payments:</span>
                {["VISA", "UPI", "Razorpay"].map(
                  (method) => (
                    <span
                      key={method}
                      className="rounded-md bg-white/10 px-2 py-1 font-extrabold text-white/76"
                    >
                      {method}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="site-container flex flex-col gap-2 py-4 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Copyright 2026 FarmStayGo. All rights reserved.
        </span>

        <span>
          Secure stays. Verified hosts. Real memories.
        </span>
      </div>
    </footer>
  );
}

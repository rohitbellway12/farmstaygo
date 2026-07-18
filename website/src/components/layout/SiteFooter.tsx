import Link from "next/link";

import BrandLogo from "../common/BrandLogo";

const companyLinks = [
  ["About Us", "/about"],
  ["Careers", "/careers"],
  ["Privacy Policy", "/privacy"],
  ["Terms & Conditions", "/terms"],
];

const supportLinks = [
  ["FAQ", "/faq"],
  ["Cancellation Policy", "/cancellation-policy"],
  ["Refund Policy", "/refund-policy"],
  ["Contact Us", "/contact"],
];

const hostLinks = [
  ["How it Works", "/host/how-it-works"],
  ["Host Login", "/login"],
  ["List Your Property", "/register"],
  ["Resources", "/host/resources"],
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: string[][];
}) {
  return (
    <div>
      <h2 className="text-sm font-extrabold text-white">
        {title}
      </h2>

      <div className="mt-4 grid gap-2.5">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="text-[13px] text-white/65 transition hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-[#052d21] text-white">
      <div className="site-container grid gap-10 py-12 md:grid-cols-2 xl:grid-cols-[1.25fr_0.7fr_0.8fr_0.8fr_1.15fr]">
        <div>
          <BrandLogo light />

          <p className="mt-5 max-w-xs text-[13px] leading-6 text-white/65">
            Discover and book verified farmhouses,
            villas, resorts and nature stays across
            India.
          </p>

          <div className="mt-5 flex gap-2">
            {["f", "◎", "▶", "in"].map((item) => (
              <span
                key={item}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-xs font-bold text-white/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <FooterColumn
          title="Company"
          links={companyLinks}
        />

        <FooterColumn
          title="Support"
          links={supportLinks}
        />

        <FooterColumn
          title="For Hosts"
          links={hostLinks}
        />

        <div>
          <h2 className="text-sm font-extrabold">
            Subscribe to our newsletter
          </h2>

          <p className="mt-4 text-[13px] leading-6 text-white/65">
            Get exciting offers and travel
            inspiration delivered to your inbox.
          </p>

          <form className="mt-4 flex overflow-hidden rounded-lg bg-white">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-11 min-w-0 flex-1 px-4 text-[13px] text-ink-900 outline-none"
            />

            <button
              type="submit"
              className="bg-brand-600 px-4 text-[13px] font-bold text-white"
            >
              Subscribe
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
            <span>We Accept:</span>
            {["VISA", "MC", "UPI", "Razorpay"].map(
              (method) => (
                <span
                  key={method}
                  className="rounded bg-white px-2 py-1 font-extrabold text-ink-700"
                >
                  {method}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="site-container flex flex-col gap-2 py-4 text-[12px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © 2026 FarmStayGo. All rights reserved.
          </span>

          <span>
            Secure stays. Verified hosts. Real
            memories.
          </span>
        </div>
      </div>
    </footer>
  );
}

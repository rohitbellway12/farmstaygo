import Link from "next/link";

interface BrandLogoProps {
  light?: boolean;
  logoUrl?: string | null;
}

export default function BrandLogo({
  light = false,
  logoUrl,
}: BrandLogoProps) {
  return (
    <Link
      href="/"
      className="inline-flex items-center"
      aria-label="Home"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className={`h-10 w-auto rounded-xl border object-contain ${
            light
              ? "border-white/20 bg-white/10"
              : "border-brand-200 bg-brand-50"
          }`}
        />
      ) : (
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl border ${
            light
              ? "border-white/20 bg-white/10 text-white"
              : "border-brand-200 bg-brand-50 text-brand-700"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-7h6v7" />
            <path d="M7 8.5 4 6" />
            <path d="M17 8.5 20 6" />
          </svg>
        </span>
      )}
    </Link>
  );
}

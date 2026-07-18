import Link from "next/link";

export default function BrandLogo({
  light = false,
}: {
  light?: boolean;
}) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5"
      aria-label="FarmStayGo home"
    >
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

      <span>
        <strong
          className={`block text-[20px] font-extrabold leading-none tracking-[-0.04em] ${
            light ? "text-white" : "text-brand-800"
          }`}
        >
          FarmStayGo
        </strong>

        <small
          className={`mt-1 block text-[9px] font-bold tracking-[0.08em] ${
            light ? "text-white/65" : "text-ink-500"
          }`}
        >
          Stay Close to Nature
        </small>
      </span>
    </Link>
  );
}

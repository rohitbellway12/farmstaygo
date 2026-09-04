"use client";

import { useState } from "react";

type ShareButtonProps = {
  url: string;
  title: string;
};

export default function ShareButton({
  url,
  title,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20-%20${encodedUrl}`,
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Twitter",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
    },
  ];

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to modal
      }
    }

    const modal = document.getElementById(
      "share-modal"
    ) as HTMLDialogElement | null;
    modal?.showModal();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not supported
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleNativeShare}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-ink-200 bg-white px-4 text-sm font-bold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
        aria-label="Share property"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      <dialog
        id="share-modal"
        className="rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard-lg backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink-900">
            Share Property
          </h3>
          <form method="dialog">
            <button
              type="submit"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </form>
        </div>

        <p className="mt-2 text-sm text-ink-500">
          Share this property with friends and family.
        </p>

        <div className="mt-4 rounded-lg border border-ink-100 bg-white p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              className="flex-1 truncate bg-transparent text-sm text-ink-700 outline-none"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              className="shrink-0 rounded-control bg-brand-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-800"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 rounded-lg border border-ink-100 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm"
            >
              <span className="text-xs font-bold text-ink-700">
                {link.name}
              </span>
            </a>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <form method="dialog">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-soft"
            >
              Close
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}

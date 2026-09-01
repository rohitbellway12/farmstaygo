"use client";

import { useState } from "react";

type Policy = {
  label: string;
  content: string | null;
  icon: React.ReactNode;
};

type PropertyPoliciesModalProps = {
  cancellationPolicy: string | null;
  termsConditions: string | null;
};

export default function PropertyPoliciesModal({
  cancellationPolicy,
  termsConditions,
}: PropertyPoliciesModalProps) {
  const [activeModal, setActiveModal] = useState<Policy | null>(null);

  const policies: Policy[] = [
    {
      label: "Cancellation Policy",
      content: cancellationPolicy,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
    {
      label: "Terms & Conditions",
      content: termsConditions,
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
          <path d="M10 9H8" />
        </svg>
      ),
    },
  ].filter((policy) => policy.content);

  if (policies.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {policies.map((policy) => (
          <button
            key={policy.label}
            type="button"
            onClick={() => setActiveModal(policy)}
            className="group flex items-center gap-2.5 rounded-xl border border-ink-100 bg-white px-4 py-3 text-left shadow-[0_8px_20px_rgba(27,58,39,0.05)] transition-all hover:border-brand-200 hover:shadow-[0_12px_24px_rgba(27,58,39,0.1)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
              {policy.icon}
            </span>
            <div>
              <p className="text-sm font-bold text-ink-800 group-hover:text-brand-700">
                {policy.label}
              </p>
              <p className="text-xs text-ink-500">Click to view</p>
            </div>
            <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  {activeModal.icon}
                </span>
                <h3 className="text-lg font-extrabold text-ink-900">
                  {activeModal.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-600"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[calc(85vh-80px)] overflow-y-auto p-6">
              <div
                className="prose prose-sm max-w-none text-ink-600"
                dangerouslySetInnerHTML={{ __html: activeModal.content || "" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

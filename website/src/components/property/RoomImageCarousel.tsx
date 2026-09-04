"use client";

import { useEffect, useState } from "react";

import { getAssetUrl } from "@/lib/assets";
import type { PublicImage } from "@/types/public";

type RoomImageCarouselProps = {
  images: PublicImage[];
  title: string;
};

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

export default function RoomImageCarousel({ images, title }: RoomImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!previewOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % images.length);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [images.length, previewOpen]);

  if (images.length === 0) {
    return <div className="grid h-48 place-items-center bg-brand-50 text-sm font-semibold text-brand-700">No image</div>;
  }

  const image = images[activeIndex];
  const move = (direction: number) => {
    setActiveIndex((index) => (index + direction + images.length) % images.length);
  };

  return (
    <div className="h-full">
      <div className="relative h-48 bg-brand-50 md:h-full md:min-h-56">
        <button type="button" onClick={() => setPreviewOpen(true)} className="block h-full w-full cursor-zoom-in">
          <img src={getAssetUrl(image.image)} alt={image.altText || title} className="h-full w-full object-cover transition hover:scale-[1.02]" />
        </button>

        {images.length > 1 && (
          <>
            <button type="button" aria-label="Previous room image" onClick={() => move(-1)} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white shadow-lg hover:bg-black/75">
              <ArrowIcon direction="left" />
            </button>
            <button type="button" aria-label="Next room image" onClick={() => move(1)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white shadow-lg hover:bg-black/75">
              <ArrowIcon direction="right" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 bg-white px-3 py-2">
          {images.map((item, index) => (
            <button key={item.id} type="button" aria-label={`Show room image ${index + 1}`} onClick={() => setActiveIndex(index)} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-6 bg-brand-700" : "w-1.5 bg-ink-200"}`} />
          ))}
        </div>
      )}

      {previewOpen && (
        <div role="dialog" aria-modal="true" aria-label={`${title} images`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setPreviewOpen(false)}>
          <div className="relative flex h-full w-full max-w-5xl items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Close image preview" onClick={() => setPreviewOpen(false)} className="absolute right-0 top-0 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25">&times;</button>
            <img src={getAssetUrl(image.image)} alt={image.altText || title} className="max-h-[85vh] max-w-full object-contain" />
            {images.length > 1 && (
              <>
                <button type="button" aria-label="Previous room image" onClick={() => move(-1)} className="absolute left-0 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ArrowIcon direction="left" /></button>
                <button type="button" aria-label="Next room image" onClick={() => move(1)} className="absolute right-0 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ArrowIcon direction="right" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";

import { getAssetUrl } from "@/lib/assets";

type Image = {
  id: string;
  image: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
};

type ImageGalleryProps = {
  images: Image[];
  title: string;
};

export default function ImageGallery({
  images,
  title,
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] =
    useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="grid h-[260px] place-items-center rounded-xl bg-brand-50 text-brand-700 sm:h-[360px] md:h-[460px]">
        No images available
      </div>
    );
  }

  const coverImage =
    images.find((image) => image.isCover) ||
    images[0];

  const remainingImages = images.filter(
    (image) => image.id !== coverImage?.id
  );

  const openPreview = (index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = "hidden";
  };

  const closePreview = () => {
    setSelectedIndex(null);
    document.body.style.overflow = "";
  };

  const showPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const showNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      showPrevious();
    } else if (event.key === "ArrowRight") {
      showNext();
    } else if (event.key === "Escape") {
      closePreview();
    }
  };

  const renderMainGrid = () => {
    if (images.length === 1) {
      return (
        <div className="h-[260px] sm:h-[360px] md:h-[460px]">
          <button
            type="button"
            onClick={() => openPreview(0)}
            className="h-full w-full overflow-hidden rounded-xl"
          >
            <img
              src={getAssetUrl(coverImage.image)}
              alt={coverImage.altText || title}
              className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
            />
          </button>
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="grid h-[260px] grid-cols-2 gap-3 sm:h-[360px] md:h-[460px]">
          {images.map((image, idx) => (
            <button
              key={image.id}
              type="button"
              onClick={() => openPreview(idx)}
              className="overflow-hidden rounded-xl"
            >
              <img
                src={getAssetUrl(image.image)}
                alt={image.altText || title}
                className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
              />
            </button>
          ))}
        </div>
      );
    }

    if (images.length === 3) {
      return (
        <div className="grid h-[260px] grid-cols-2 gap-3 sm:h-[360px] md:h-[460px]">
          <button
            type="button"
            onClick={() => openPreview(0)}
            className="row-span-2 overflow-hidden rounded-xl"
          >
            <img
              src={getAssetUrl(coverImage.image)}
              alt={coverImage.altText || title}
              className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
            />
          </button>
          {remainingImages.slice(0, 2).map((image, idx) => {
            const globalIndex = images.findIndex(
              (img) => img.id === image.id
            );
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => openPreview(globalIndex)}
                className="overflow-hidden rounded-xl"
              >
                <img
                  src={getAssetUrl(image.image)}
                  alt={image.altText || title}
                  className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
                />
              </button>
            );
          })}
        </div>
      );
    }

    if (images.length === 4) {
      return (
        <div className="grid h-[260px] grid-cols-2 gap-3 sm:h-[360px] md:h-[460px]">
          {images.map((image, idx) => (
            <button
              key={image.id}
              type="button"
              onClick={() => openPreview(idx)}
              className="overflow-hidden rounded-xl"
            >
              <img
                src={getAssetUrl(image.image)}
                alt={image.altText || title}
                className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
              />
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="grid h-[260px] gap-3 overflow-hidden rounded-xl sm:h-[360px] md:h-[460px] md:grid-cols-[2fr_1fr]">
        <button
          type="button"
          onClick={() => openPreview(0)}
          className="overflow-hidden rounded-l-xl"
        >
          <img
            src={getAssetUrl(coverImage.image)}
            alt={coverImage.altText || title}
            className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
          />
        </button>

        <div className="hidden grid-cols-2 gap-3 md:grid">
          {remainingImages.slice(0, 4).map((image) => {
            const globalIndex = images.findIndex(
              (img) => img.id === image.id
            );

            return (
              <button
                key={image.id}
                type="button"
                onClick={() =>
                  openPreview(globalIndex)
                }
                className="overflow-hidden"
              >
                <img
                  src={getAssetUrl(image.image)}
                  alt={image.altText || title}
                  className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderMainGrid()}

      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => openPreview(index)}
              className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-ink-100 transition hover:border-brand-300"
            >
              <img
                src={getAssetUrl(image.image)}
                alt={image.altText || title}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          onClick={closePreview}
          onKeyDown={handleKeyDown}
        >
          <button
            type="button"
            onClick={closePreview}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-6 w-6"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {selectedIndex > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPrevious();
              }}
              className="absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-6 w-6"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {selectedIndex < images.length - 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNext();
              }}
              className="absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="h-6 w-6"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

          <img
            src={getAssetUrl(images[selectedIndex].image)}
            alt={images[selectedIndex].altText || title}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(event) =>
              event.stopPropagation()
            }
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}

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
  const [selectedImage, setSelectedImage] =
    useState<Image | null>(null);

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

  return (
    <>
      <div className="grid h-[260px] gap-3 overflow-hidden rounded-xl sm:h-[360px] md:h-[460px] md:grid-cols-[2fr_1fr]">
        <button
          type="button"
          onClick={() =>
            setSelectedImage(coverImage)
          }
          className="overflow-hidden rounded-l-xl"
        >
          <img
            src={getAssetUrl(coverImage.image)}
            alt={coverImage.altText || title}
            className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
          />
        </button>

        {remainingImages.length > 0 && (
          <div className="hidden grid-cols-2 gap-3 md:grid">
            {remainingImages.slice(0, 4).map((image) => (
              <button
                key={image.id}
                type="button"
                onClick={() =>
                  setSelectedImage(image)
                }
                className="overflow-hidden"
              >
                <img
                  src={getAssetUrl(image.image)}
                  alt={image.altText || title}
                  className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() =>
                setSelectedImage(image)
              }
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

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
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

          <img
            src={getAssetUrl(selectedImage.image)}
            alt={selectedImage.altText || title}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";

import { apiFetch } from "@/lib/api";
import type { PublicReview, PublicReviewsResponse } from "@/types/public";

type ReviewsSectionProps = {
  propertyId: string;
};

export default function ReviewsSection({ propertyId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    guestName: "",
    guestEmail: "",
    rating: 5,
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        const response = await apiFetch<PublicReviewsResponse>(
          `/public/properties/${propertyId}/reviews`
        );
        setReviews(response.data.reviews);
        setAverageRating(response.data.averageRating);
        setTotalReviews(response.data.totalReviews);
      } catch {
        setError("Unable to load reviews.");
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage("");

    try {
      await apiFetch("/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          ...formData,
        }),
      });

      setSubmitMessage("Review submitted successfully!");
      setFormData({ guestName: "", guestEmail: "", rating: 5, comment: "" });
      setShowForm(false);

      const response = await apiFetch<PublicReviewsResponse>(
        `/public/properties/${propertyId}/reviews`
      );
      setReviews(response.data.reviews);
      setAverageRating(response.data.averageRating);
      setTotalReviews(response.data.totalReviews);
    } catch {
      setSubmitMessage("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${
              star <= rating ? "text-amber-400" : "text-ink-200"
            }`}
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <section>
        <h2 className="text-2xl font-extrabold text-ink-900">Customer Reviews</h2>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-ink-50" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-ink-900">Customer Reviews</h2>
          {totalReviews > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {renderStars(Math.round(averageRating))}
                <span className="ml-1 text-sm font-bold text-ink-700">
                  {averageRating.toFixed(1)}
                </span>
              </div>
              <span className="text-sm text-ink-500">
                ({totalReviews} review{totalReviews !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-4 text-sm font-bold text-white hover:bg-brand-800"
        >
          {showForm ? "Cancel" : "Write a Review"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-ink-100 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-ink-600">Your Name *</span>
              <input
                type="text"
                required
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-ink-600">Your Email *</span>
              <input
                type="email"
                required
                value={formData.guestEmail}
                onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold text-ink-600">Rating *</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="p-0.5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-7 w-7 ${
                      star <= formData.rating ? "text-amber-400" : "text-ink-200"
                    }`}
                    fill="currentColor"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold text-ink-600">Your Review *</span>
            <textarea
              required
              rows={4}
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Share your experience..."
              className="w-full resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          {submitMessage && (
            <p className={`mt-3 text-sm font-bold ${submitMessage.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
              {submitMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {!error && reviews.length === 0 && (
        <div className="mt-5 rounded-xl border border-ink-100 bg-white p-8 text-center">
          <p className="text-sm text-ink-500">No reviews yet. Be the first to review this property!</p>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="mt-5 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-ink-100 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink-800">{review.guestName}</p>
                  <p className="text-xs text-ink-400">
                    {new Date(review.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {renderStars(review.rating)}
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-600">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

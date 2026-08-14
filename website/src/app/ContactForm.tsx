"use client";

import {
  type FormEvent,
  useState,
} from "react";

import { apiFetch, ApiRequestError } from "@/lib/api";

interface ContactFormProps {
  title?: string;
  description?: string;
  submitLabel?: string;
  successMessage?: string;
  className?: string;
  onSuccess?: (name: string) => void;
}

export default function ContactForm({
  title = "Talk to our experts",
  description = "Share your requirements and our team will help you shortlist the best stays.",
  submitLabel = "Contact Us",
  successMessage = "Thank you for reaching out! Our team will contact you shortly.",
  className = "",
  onSuccess,
}: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSubject("");
    setMessage("");
    setErrors({});
    setServerError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Please enter your name.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!subject.trim() || subject.trim().length < 2) {
      newErrors.subject = "Please enter a subject.";
    }

    if (!message.trim() || message.trim().length < 10) {
      newErrors.message = "Please enter a message of at least 10 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      await apiFetch("/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      setSubmitted(true);
      onSuccess?.(name.trim());
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerError(error.message || "Unable to send your message. Please try again later.");
      } else {
        setServerError("Unable to send your message. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`rounded-2xl bg-white p-6 shadow-[0_12px_36px_rgba(30,79,40,0.10)] ring-1 ring-ink-100 ${className}`}>
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-50 text-green-600">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
          <h3 className="mt-4 text-xl font-extrabold text-ink-900">Message Sent!</h3>
          <p className="mt-2 text-sm leading-6 text-ink-500">{successMessage}</p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              resetForm();
            }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-ink-200 px-4 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-white p-6 shadow-[0_12px_36px_rgba(30,79,40,0.10)] ring-1 ring-ink-100 ${className}`}>
      <h3 className="text-xl font-extrabold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-500">{description}</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-700">Name <span className="text-red-500">*</span></span>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((prev) => ({ ...prev, name: "" })); }}
              placeholder="Your full name"
              className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 ${errors.name ? "border-red-400" : "border-ink-200"}`}
            />
            {errors.name && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.name}</span>}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-700">Email <span className="text-red-500">*</span></span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((prev) => ({ ...prev, email: "" })); }}
              placeholder="you@example.com"
              className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 ${errors.email ? "border-red-400" : "border-ink-200"}`}
            />
            {errors.email && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.email}</span>}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-700">Phone Number</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-700">Enquiring For <span className="text-red-500">*</span></span>
            <input
              type="text"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); if (errors.subject) setErrors((prev) => ({ ...prev, subject: "" })); }}
              placeholder="e.g. Farmhouse stay for weekend"
              className={`h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 ${errors.subject ? "border-red-400" : "border-ink-200"}`}
            />
            {errors.subject && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.subject}</span>}
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-700">Message <span className="text-red-500">*</span></span>
          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); if (errors.message) setErrors((prev) => ({ ...prev, message: "" })); }}
            placeholder="Tell us about your requirements, dates, group size, budget..."
            rows={4}
            className={`w-full rounded-lg border bg-white px-3.5 py-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/10 ${errors.message ? "border-red-400" : "border-ink-200"}`}
          />
          {errors.message && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.message}</span>}
        </label>

        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {submitting ? "Sending..." : submitLabel}
        </button>
      </form>
    </div>
  );
}

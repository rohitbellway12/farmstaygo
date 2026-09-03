"use client";

import { useEffect, useState, type FC } from "react";

import {
  apiFetch,
  ApiRequestError,
} from "@/lib/api";

import { getAssetUrl } from "@/lib/assets";

import type {
  PublicContactInfo,
  PublicContactInfoResponse,
  PublicFaq,
  PublicFaqsResponse,
  PublicServiceCity,
  PublicServiceCitiesResponse,
  ContactMessageResponse,
} from "@/types/public";

/* =========================================================
   MAIL ICON
========================================================= */

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
      />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/* =========================================================
   PHONE ICON
========================================================= */

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.14.93.36 1.84.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.97.34 1.88.56 2.81.7a2 2 0 0 1 1.72 2z" />
    </svg>
  );
}

/* =========================================================
   SOCIAL ICONS
========================================================= */

const socialIcons: Record<string, FC> = {
  /* ---------------- FACEBOOK ---------------- */

  facebook: () => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v8h4v-8h3.5l.5-4H13V9c0-.67.33-1 1-1Z" />
    </svg>
  ),

  /* ---------------- INSTAGRAM ---------------- */

  instagram: () => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
      />

      <circle
        cx="12"
        cy="12"
        r="4"
      />

      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  ),

  /* ---------------- YOUTUBE ---------------- */

  youtube: () => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.5 12 3.5 12 3.5s-7.55 0-9.4.58A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.58 9.4.58 9.4.58s7.55 0 9.4-.58a3 3 0 0 0 2.1-2.12A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.9V8.1L16 12l-6.4 3.9Z" />
    </svg>
  ),

  /* ---------------- LINKEDIN ---------------- */

  linkedin: () => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.5 3.5A2.5 2.5 0 1 1 5.5 8a2.5 2.5 0 0 1 0-4.5ZM3.5 9.5h4v11h-4v-11Zm6.5 0h3.8v1.5h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" />
    </svg>
  ),

  /* ---------------- WHATSAPP ---------------- */

  whatsapp: () => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 .05 5.35.05 11.95c0 2.1.55 4.15 1.6 5.95L0 24l6.25-1.64a11.9 11.9 0 0 0 5.75 1.47h.01c6.6 0 11.95-5.35 11.95-11.95 0-3.2-1.25-6.2-3.46-8.38ZM12.01 21.7h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.71.98.99-3.62-.23-.37a9.8 9.8 0 0 1-1.5-5.16c0-5.4 4.4-9.8 9.81-9.8 2.61 0 5.07 1.02 6.91 2.87a9.77 9.77 0 0 1 2.88 6.93c0 5.4-4.4 9.75-9.78 9.75Zm5.37-7.34c-.3-.15-1.72-.85-1.98-.95-.27-.1-.46-.15-.65.15-.19.29-.73.95-.9 1.14-.16.19-.33.22-.62.07-.29-.15-1.23-.45-2.34-1.43-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.5.15-.16.2-.28.3-.47.1-.19.05-.36-.02-.5-.08-.15-.65-1.55-.89-2.12-.23-.56-.47-.48-.65-.49h-.55c-.2 0-.5.07-.76.36-.26.29-1 .97-1 2.36s1.03 2.74 1.17 2.93c.14.19 2.01 3.06 4.86 4.29.68.29 1.21.47 1.63.6.69.22 1.32.19 1.81.12.55-.08 1.72-.7 1.96-1.39.24-.69.24-1.28.17-1.4-.07-.12-.26-.19-.55-.34Z" />
    </svg>
  ),

  /* ---------------- OTHER ---------------- */

  other: () => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M8 12h8M12 8v8" />
    </svg>
  ),
};

/* =========================================================
   GET CONTACT INFO
========================================================= */

async function getContactInfo(): Promise<PublicContactInfo> {
  try {
    const response =
      await apiFetch<PublicContactInfoResponse>(
        "/contact/info"
      );

    return response.data;
  } catch {
    return {
      email: null,
      phone: null,
      socialLinks: [],
    };
  }
}

/* =========================================================
   GET FAQS
========================================================= */

async function getFaqs(): Promise<PublicFaq[]> {
  try {
    const response =
      await apiFetch<PublicFaqsResponse>(
        "/public/faqs"
      );

    return response.data;
  } catch {
    return [];
  }
}

/* =========================================================
   GET SERVICE CITIES
========================================================= */

async function getServiceCities(): Promise<PublicServiceCity[]> {
  try {
    const response =
      await apiFetch<PublicServiceCitiesResponse>(
        "/public/service-cities"
      );

    return response.data;
  } catch {
    return [];
  }
}

/* =========================================================
   FORM TYPES
========================================================= */

interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

interface ContactClientProps {
  contactImage?: string | null;
}

/* =========================================================
   CONTACT CLIENT
========================================================= */

export default function ContactClient({
  contactImage,
}: ContactClientProps) {
  const [contactInfo, setContactInfo] =
    useState<PublicContactInfo>({
      email: null,
      phone: null,
      socialLinks: [],
    });

  const [faqs, setFaqs] =
    useState<PublicFaq[]>([]);

  const [openFaqId, setOpenFaqId] =
    useState<string | null>(null);

  const [serviceCities, setServiceCities] =
    useState<PublicServiceCity[]>([]);

  const [form, setForm] =
    useState<FormState>({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    });

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submitStatus, setSubmitStatus] =
    useState<"idle" | "success" | "error">(
      "idle"
    );

  const [submitMessage, setSubmitMessage] =
    useState("");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadContactInfo = async () => {
      const info = await getContactInfo();

      if (!cancelled) {
        setContactInfo(info);
      }
    };

    const loadFaqs = async () => {
      const data = await getFaqs();

      if (!cancelled) {
        setFaqs(data);
      }
    };

    const loadServiceCities = async () => {
      const cities = await getServiceCities();

      if (!cancelled) {
        setServiceCities(cities);
      }
    };

    void loadContactInfo();
    void loadFaqs();
    void loadServiceCities();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (form.name.trim().length < 2) {
      newErrors.name =
        "Please enter your name (at least 2 characters).";
    }

    if (!form.email.trim()) {
      newErrors.email =
        "Please enter your email.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email
      )
    ) {
      newErrors.email =
        "Please enter a valid email address.";
    }

    if (form.subject.trim().length < 2) {
      newErrors.subject =
        "Please enter a subject.";
    }

    if (form.message.trim().length < 10) {
      newErrors.message =
        "Please enter a message (at least 10 characters).";
    }

    return newErrors;
  };

  /* =======================================================
     FAQ TOGGLE
  ======================================================= */

  const toggleFaq = (id: string) => {
    setOpenFaqId((current) =>
      current === id ? null : id
    );
  };

  /* =======================================================
     FORM SUBMIT
  ======================================================= */

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const validationErrors = validate();

    setErrors(validationErrors);

    if (
      Object.keys(validationErrors).length > 0
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      const response =
        await apiFetch<ContactMessageResponse>(
          "/contact",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(form),
          }
        );

      setSubmitStatus("success");
      setSubmitMessage(response.message);

      setForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });

      setErrors({});
    } catch (error) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : "Unable to send your message. Please try again later.";

      setSubmitStatus("error");
      setSubmitMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="section-spacing">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="bg-brand-700">
        <div className="site-container py-10 text-center text-white sm:py-14">

          <h1 className="text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
            Contact FarmStayGo
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            Let&apos;s plan your perfect getaway
          </p>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
            Have a question, need help choosing a stay,
            or want to list your property with
            FarmStayGo? We&apos;re here to help.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">

            <a
              href="#contact-form"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-sm font-extrabold text-brand-700 transition hover:bg-brand-50"
            >
              Send Message
            </a>

            <a
              href="#faq-section"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/40 px-8 text-sm font-extrabold text-white transition hover:bg-white/10"
            >
              Read FAQs
            </a>

          </div>
        </div>
      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="site-container">

        <div className="mt-12 grid gap-10 lg:grid-cols-3">

          {/* =================================================
              CONTACT INFORMATION
          ================================================= */}

          <div className="lg:col-span-1">

            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">

              <h2 className="text-lg font-extrabold text-ink-900">
                Contact Information
              </h2>

              <p className="mt-1 text-sm text-ink-500">
                Reach us directly through any of these channels.
              </p>

              <div className="mt-6 space-y-5">

                {/* EMAIL */}

                {contactInfo.email && (
                  <div className="flex gap-4">

                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <MailIcon />
                    </span>

                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-500">
                        Email
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-ink-800">
                        {contactInfo.email}
                      </p>
                    </div>

                  </div>
                )}

                {/* PHONE */}

                {contactInfo.phone && (
                  <div className="flex gap-4">

                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <PhoneIcon />
                    </span>

                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-500">
                        Phone
                      </h3>

                      <p className="mt-1 text-sm font-semibold text-ink-800">
                        {contactInfo.phone}
                      </p>
                    </div>

                  </div>
                )}

                {/* =================================================
                    SOCIAL MEDIA
                ================================================= */}

                {contactInfo.socialLinks &&
                  contactInfo.socialLinks.length > 0 && (
                    <div>

                      <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-500">
                        Follow Us
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-3">

                        {contactInfo.socialLinks.map(
                          (link) => {

                            /*
                             * Convert values like:
                             * Facebook
                             * facebook
                             * FaceBook
                             * Instagram
                             * Whats App
                             * Whats-App
                             * Whats_App
                             */

                            const normalizedPlatform =
                              link.platform
                                .trim()
                                .toLowerCase()
                                .replace(
                                  /[\s_-]+/g,
                                  ""
                                );

                            let Icon: FC =
                              socialIcons.other;

                            if (
                              normalizedPlatform.includes(
                                "facebook"
                              )
                            ) {
                              Icon =
                                socialIcons.facebook;
                            } else if (
                              normalizedPlatform.includes(
                                "instagram"
                              )
                            ) {
                              Icon =
                                socialIcons.instagram;
                            } else if (
                              normalizedPlatform.includes(
                                "youtube"
                              )
                            ) {
                              Icon =
                                socialIcons.youtube;
                            } else if (
                              normalizedPlatform.includes(
                                "linkedin"
                              )
                            ) {
                              Icon =
                                socialIcons.linkedin;
                            } else if (
                              normalizedPlatform.includes(
                                "whatsapp"
                              )
                            ) {
                              Icon =
                                socialIcons.whatsapp;
                            }

                            return (
                              <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={
                                  link.platform
                                }
                                title={
                                  link.platform
                                }
                                className="
                                  grid
                                  h-10
                                  w-10
                                  place-items-center
                                  rounded-full
                                  bg-brand-50
                                  text-brand-700
                                  transition-all
                                  duration-300
                                  hover:bg-brand-100
                                  hover:text-brand-800
                                "
                              >
                                <Icon />
                              </a>
                            );
                          }
                        )}

                      </div>
                    </div>
                  )}

              </div>
            </div>
          </div>

          {/* =================================================
              CONTACT FORM
          ================================================= */}

          <div className="lg:col-span-2">

            <div
              id="contact-form"
              className="rounded-2xl border border-ink-100 bg-white p-8 shadow-sm"
            >

              <div className="mb-6">

                <h2 className="text-lg font-extrabold text-ink-900">
                  Send us a Message
                </h2>

                <p className="mt-1 text-sm text-ink-500">
                  Fill out the form below and our team will get back to you within 24 hours.
                </p>

              </div>

              {/* SUCCESS */}

              {submitStatus === "success" ? (

                <div className="text-center">

                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">

                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-4-4" />
                    </svg>

                  </span>

                  <h3 className="mt-4 text-xl font-extrabold text-ink-900">
                    Message Sent!
                  </h3>

                  <p className="mt-2 text-sm text-ink-500">
                    {submitMessage}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setSubmitStatus("idle")
                    }
                    className="mt-6 rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-extrabold text-white hover:bg-brand-800"
                  >
                    Send Another
                  </button>

                </div>

              ) : (

                /* =================================================
                   FORM
                ================================================= */

                <form onSubmit={handleSubmit}>

                  <div className="grid gap-5 sm:grid-cols-2">

                    {/* NAME */}

                    <div className="sm:col-span-2">

                      <label className="block text-xs font-extrabold text-ink-600">
                        Full Name *
                      </label>

                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            name: e.target.value,
                          })
                        }
                        className={`mt-1 h-12 w-full rounded-lg border bg-surface px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 ${
                          errors.name
                            ? "border-danger focus:border-danger focus:ring-4 focus:ring-danger/10"
                            : "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        }`}
                        placeholder="John Doe"
                      />

                      {errors.name && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.name}
                        </p>
                      )}

                    </div>

                    {/* EMAIL */}

                    <div>

                      <label className="block text-xs font-extrabold text-ink-600">
                        Email *
                      </label>

                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            email: e.target.value,
                          })
                        }
                        className={`mt-1 h-12 w-full rounded-lg border bg-surface px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 ${
                          errors.email
                            ? "border-danger focus:border-danger focus:ring-4 focus:ring-danger/10"
                            : "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        }`}
                        placeholder="you@example.com"
                      />

                      {errors.email && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.email}
                        </p>
                      )}

                    </div>

                    {/* PHONE */}

                    <div>

                      <label className="block text-xs font-extrabold text-ink-600">
                        Phone
                      </label>

                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phone: e.target.value,
                          })
                        }
                        className={`mt-1 h-12 w-full rounded-lg border bg-surface px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 ${
                          errors.phone
                            ? "border-danger focus:border-danger focus:ring-4 focus:ring-danger/10"
                            : "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        }`}
                        placeholder="+91 9876543210"
                      />

                      {errors.phone && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.phone}
                        </p>
                      )}

                    </div>

                    {/* SUBJECT */}

                    <div className="sm:col-span-2">

                      <label className="block text-xs font-extrabold text-ink-600">
                        Subject *
                      </label>

                      <input
                        type="text"
                        value={form.subject}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            subject: e.target.value,
                          })
                        }
                        className={`mt-1 h-12 w-full rounded-lg border bg-surface px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 ${
                          errors.subject
                            ? "border-danger focus:border-danger focus:ring-4 focus:ring-danger/10"
                            : "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        }`}
                        placeholder="How can we help you?"
                      />

                      {errors.subject && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.subject}
                        </p>
                      )}

                    </div>

                    {/* MESSAGE */}

                    <div className="sm:col-span-2">

                      <label className="block text-xs font-extrabold text-ink-600">
                        Message *
                      </label>

                      <textarea
                        value={form.message}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            message: e.target.value,
                          })
                        }
                        rows={5}
                        className={`mt-1 w-full rounded-lg border bg-surface px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 ${
                          errors.message
                            ? "border-danger focus:border-danger focus:ring-4 focus:ring-danger/10"
                            : "border-ink-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        }`}
                        placeholder="Write your message here..."
                      />

                      {errors.message && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.message}
                        </p>
                      )}

                    </div>

                    {/* ERROR */}

                    {submitStatus === "error" && (
                      <div className="sm:col-span-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                        {submitMessage}
                      </div>
                    )}

                    {/* SUBMIT */}

                    <div className="sm:col-span-2">

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 w-full rounded-lg bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:opacity-60"
                      >
                        {isSubmitting
                          ? "Sending..."
                          : "Send Message"}
                      </button>

                    </div>

                  </div>
                </form>
              )}

            </div>
          </div>
        </div>

        {/* =====================================================
            PROPERTY OWNER
        ===================================================== */}

        <section className="mt-12 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">

          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">

            <div>

              <h2 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
                For Property Owners
              </h2>

              <p className="mt-3 text-sm leading-7 text-ink-600 sm:text-base">
                Have a farmstay or villa? Turn your property
                into your next source of income. List your
                farmhouse or villa on FarmStayGo and connect
                with guests looking for memorable stays and
                experiences around{" "}
                {serviceCities[0]?.name || "Indore"}.
              </p>

              <div className="mt-6">

                <a
                  href="/vendor/register"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-brand-700 px-8 text-sm font-extrabold text-white transition hover:bg-brand-800"
                >
                  List Your Property
                </a>

              </div>
            </div>

            {/* IMAGE */}

            <div className="relative aspect-video overflow-hidden rounded-xl bg-brand-50">

              <img
                src={
                  contactImage
                    ? getAssetUrl(contactImage)
                    : getAssetUrl(
                        "/storage/hero.png"
                      )
                }
                alt="FarmStay property"
                className="h-full w-full object-cover"
              />

            </div>

          </div>
        </section>

        {/* =====================================================
            FAQ
        ===================================================== */}

        {faqs.length > 0 && (
          <section
            id="faq-section"
            className="mt-16"
          >

            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">

              <div className="text-center">

                <h2 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
                  Frequently Asked Questions
                </h2>

                <p className="mt-2 text-sm text-ink-500 sm:text-base">
                  Quick answers to common questions about FarmStayGo
                </p>

              </div>

              <div className="mt-8 space-y-3">

                {faqs.map((faq) => {

                  const isOpen =
                    openFaqId === faq.id;

                  return (
                    <div
                      key={faq.id}
                      className="rounded-xl border border-ink-100 bg-surface-soft transition hover:border-ink-200"
                    >

                      <button
                        type="button"
                        onClick={() =>
                          toggleFaq(faq.id)
                        }
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                      >

                        <span className="text-sm font-extrabold text-ink-900 sm:text-base">
                          {faq.question}
                        </span>

                        <svg
                          viewBox="0 0 24 24"
                          className={`h-5 w-5 shrink-0 text-ink-500 transition-transform ${
                            isOpen
                              ? "rotate-180"
                              : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>

                      </button>

                      {isOpen && (
                        <div className="border-t border-ink-100 px-5 py-5 sm:px-6">

                          <p className="text-sm leading-7 text-ink-600 sm:text-base">
                            {faq.answer}
                          </p>

                        </div>
                      )}

                    </div>
                  );
                })}

              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
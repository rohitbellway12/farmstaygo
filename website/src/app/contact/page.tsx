"use client";

import type { Metadata } from "next";
import { useEffect, useState } from "react";

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

export const metadata: Metadata = {
  title: "Contact FarmStayGo | Farmhouse Booking Near Indore",
  description:
    "Contact FarmStayGo for farmhouse bookings, property enquiries, host partnerships and customer support. Get help finding and booking the right stay near Indore.",
};

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.14.93.36 1.84.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.97.34 1.88.56 2.81.7a2 2 0 0 1 1.72 2z" />
    </svg>
  );
}

const socialIcons: Record<string, React.FC> = {
  facebook: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M22.675 0h-21.35C.596 0 0 .59 0 1.326v21.348C0 23.41.595 24 1.326 24h11.495v-9.294H9.692V11.01h3.129V8.414c0-3.1 1.894-4.788 4.66-4.788 1.34 0 2.48.992 2.48 2.477v4.12h-2.479c-1.326 0-1.857.687-1.857 1.823v2.378h3.874l-.501 2.704h-3.37v9.294C23.406 24 24 23.41 24 22.674V1.326C24 .59 23.405 0 22.675 0z" />
    </svg>
  ),
  instagram: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.81.33 4 .58c-.87.27-1.65.65-2.42 1.42S.35 3.13.08 4C-.17 4.81-.37 5.78-.43 7.05C-.01 8.33 0 8.74 0 12s-.01 3.66.07 4.95c.06 1.17.25 1.87.43 2.33.22.66.48 1.11.91 1.56.43.43.85.71 1.42.91.43.17 1.06.38 2.23.43 1.26.06 1.64.07 4.84.07s3.58-.01 4.84-.07c1.17-.05 1.8-.25 2.23-.43.57-.22 1.11-.48 1.56-.91.43-.43.71-.85.91-1.42.17-.43.38-1.06.43-2.23.06-1.26.07-1.63.07-4.84s-.01-3.58-.07-4.84c-.05-1.17-.25-1.8-.43-2.23-.22-.66-.48-1.11-.91-1.56-.43-.43-.85-.71-1.42-.91-.43-.17-1.06-.38-2.23-.43C15.66.01 15.26 0 12 0zm0 5.83a6.17 6.17 0 1 1 0 12.34 6.17 6.17 0 0 1 0-12.34zm0 10.24a4.07 4.07 0 1 0 0-8.14 4.07 4.07 0 0 0 0 8.14zm6.39-12.37a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
    </svg>
  ),
  youtube: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M19.63 3.5C18.5 3.07 16.56 3 12 3s-6.5.07-7.63.54C3.24 4.04 2.5 4.78 2.5 5.75v12.5c0 .97.74 1.7 1.87 2.19C5.5 20.93 7.44 21 12 21s6.5-.07 7.63-.54c1.13-.49 1.87-1.23 1.87-2.2V5.75c0-.97-.74-1.7-1.87-2.25zM10 8v8l7-4z" />
    </svg>
  ),
  linkedin: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67h-3.56V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.42 2.42 0 1 1 0-4.83 2.42 2.42 0 0 1 0 4.83z" />
    </svg>
  ),
  other: () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 13v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M9 3h6a2 2 0 0 1 2 2v5" />
      <path d="M9 11l3 3 3-3" />
    </svg>
  ),
};

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

export default function ContactPage() {
  const [contactInfo, setContactInfo] =
    useState<PublicContactInfo>({
      email: null,
      phone: null,
      socialLinks: [],
    });
  const [faqs, setFaqs] = useState<PublicFaq[]>([]);
  const [openFaqId, setOpenFaqId] = useState<
    string | null
  >(null);
  const [serviceCities, setServiceCities] = useState<
    PublicServiceCity[]
  >([]);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] =
    useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] =
    useState("");

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

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (form.name.trim().length < 2) {
      newErrors.name =
        "Please enter your name (at least 2 characters).";
    }

    if (!form.email.trim()) {
      newErrors.email = "Please enter your email.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      newErrors.email =
        "Please enter a valid email address.";
    }

    if (form.subject.trim().length < 2) {
      newErrors.subject = "Please enter a subject.";
    }

    if (form.message.trim().length < 10) {
      newErrors.message =
        "Please enter a message (at least 10 characters).";
    }

    return newErrors;
  };

  const toggleFaq = (id: string) => {
    setOpenFaqId((current) =>
      current === id ? null : id
    );
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitMessage("");

    try {
      const response = await apiFetch<ContactMessageResponse>(
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

  return (
    <div className="section-spacing">
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

      <div className="site-container">
        <div className="mt-12 grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-extrabold text-ink-900">
                  Contact Information
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Reach us directly through any of these channels.
                </p>

                <div className="mt-6 space-y-5">
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

                  {contactInfo.socialLinks &&
                    contactInfo.socialLinks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-500">
                        Follow Us
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-3">
                        {contactInfo.socialLinks.map(
                          (link) => {
                            const Icon =
                              socialIcons[
                                link.platform
                                  .toLowerCase()
                              ] || socialIcons.other;

                            return (
                              <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100"
                                title={link.platform}
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

            <div className="lg:col-span-2">
              <div id="contact-form" className="rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-lg font-extrabold text-ink-900">
                    Send us a Message
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Fill out the form below and our team will get back to you within 24 hours.
                  </p>
                </div>
                {submitStatus === "success" ? (
                  <div className="text-center">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
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
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-5 sm:grid-cols-2">
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

                      {submitStatus === "error" && (
                        <div className="sm:col-span-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                          {submitMessage}
                        </div>
                      )}

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

              <div className="relative aspect-video overflow-hidden rounded-xl bg-brand-50">
                <img
                  src={getAssetUrl("/storage/hero.png")}
                  alt="FarmStay property"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </section>

          {faqs.length > 0 && (
            <section id="faq-section" className="mt-16">
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
                    const isOpen = openFaqId === faq.id;

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

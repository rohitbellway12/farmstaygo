"use client";

import { useEffect, useState } from "react";

import {
  createPublicSupportTicket,
  fetchPublicSupportTicketsByEmail,
  fetchPublicSupportTicketById,
  type PublicSupportTicket,
  type PublicSupportTicketResponse,
} from "@/types/support";

interface FormState {
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
}

type Step = "form" | "tickets" | "detail";

export default function SupportClient() {
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [tickets, setTickets] = useState<PublicSupportTicket[]>([]);
  const [selected, setSelected] = useState<PublicSupportTicket | null>(null);
  const [detail, setDetail] = useState<PublicSupportTicketResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<FormState>({
    userName: "",
    userEmail: "",
    subject: "",
    description: "",
    category: "",
    priority: "MEDIUM",
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const authData = localStorage.getItem("farmstaygo_customer_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const user = parsed?.data?.user;
        if (user) {
          const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
          setForm({
            userName: fullName || "",
            userEmail: user.email || "",
            subject: "",
            description: "",
            category: "",
            priority: "MEDIUM",
          });
          setEmail(user.email || "");
          setIsLoggedIn(true);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.userEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.userEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.subject.trim().length < 3) {
      setError("Subject must be at least 3 characters.");
      return;
    }

    if (form.description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await createPublicSupportTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        userEmail: form.userEmail.trim(),
        userName: form.userName.trim() || undefined,
        category: form.category.trim() || undefined,
        priority: form.priority,
      });

      setSuccess("Support ticket created successfully. Our team will get back to you soon.");
      setEmail(form.userEmail);
      setForm({
        userName: form.userName,
        userEmail: form.userEmail,
        subject: "",
        description: "",
        category: "",
        priority: "MEDIUM",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create ticket. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewTickets = async () => {
    const lookupEmail = email.trim() || form.userEmail.trim();

    if (!lookupEmail) {
      setError("Please enter your email address in the form above first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetchPublicSupportTicketsByEmail(lookupEmail);
      setTickets(response.data || []);
      setStep("tickets");
    } catch {
      setError("Unable to load tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket: PublicSupportTicket) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchPublicSupportTicketById(ticket.id);
      setDetail(response);
      setSelected(ticket);
      setStep("detail");
    } catch {
      setError("Unable to load ticket details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-spacing">
      <div className="site-container">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-[-0.035em] text-ink-900 sm:text-4xl">
              Support
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-500 sm:text-base">
              Have an issue with a booking, property, or payment? Submit a support ticket and our team will assist you.
            </p>
          </div>

          <div className="mt-12">
            {step === "form" && (
              <div className="mx-auto max-w-xl rounded-2xl border border-ink-100 bg-ink-50 p-8 shadow-sm sm:p-10">
                <h2 className="text-xl font-extrabold text-ink-900">
                  Create a Support Ticket
                </h2>
                <p className="mt-2 text-sm text-ink-500">
                  Fill out the form below and our support team will get back to you as soon as possible.
                </p>

                <form onSubmit={handleCreateTicket} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-ink-600">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.userName}
                      onChange={(e) => setForm({ ...form, userName: e.target.value })}
                      className="mt-1 h-12 w-full rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-ink-600">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.userEmail}
                      onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                      required
                      readOnly={isLoggedIn}
                      className={`mt-1 h-12 w-full rounded-lg border bg-white px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 ${
                        isLoggedIn ? "border-ink-200 bg-ink-50 text-ink-700" : "border-ink-200"
                      }`}
                      placeholder="you@example.com"
                    />
                    {isLoggedIn && (
                      <p className="mt-1 text-[10px] text-ink-500">
                        Email is pre-filled from your account.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-ink-600">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      required
                      minLength={3}
                      className="mt-1 h-12 w-full rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                      placeholder="Short summary of your issue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-ink-600">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                      minLength={10}
                      rows={5}
                      className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                      placeholder="Describe your issue in detail..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-ink-600">
                        Category
                      </label>
                      <input
                        type="text"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="mt-1 h-12 w-full rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                        placeholder="e.g. Booking, Payment"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-ink-600">
                        Priority
                      </label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="mt-1 h-12 w-full rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm font-bold text-success">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full rounded-lg bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </form>

                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/support/my-tickets";
                    }}
                    className="h-12 w-full rounded-lg border border-ink-200 bg-white px-6 text-sm font-extrabold text-ink-800 transition hover:bg-ink-50"
                  >
                    View My Tickets
                  </button>
                </div>
              </div>
            )}

            {step === "tickets" && (
              <div className="mx-auto max-w-3xl">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="mb-4 text-sm font-bold text-brand-700 hover:text-brand-800"
                >
                  ← Back to create new ticket
                </button>

                <div className="rounded-2xl border border-ink-100 bg-ink-50 p-8 shadow-sm">
                  <h2 className="text-xl font-extrabold text-ink-900">
                    Your Support Tickets
                  </h2>
                  <p className="mt-1 text-sm text-ink-500">
                    Showing tickets for {email || form.userEmail}
                  </p>

                  {tickets.length === 0 ? (
                    <div className="mt-6 text-center">
                      <p className="text-sm text-ink-500">No tickets found for this email.</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => handleViewTicket(ticket)}
                          className="cursor-pointer rounded-lg border border-ink-200 bg-white p-4 transition hover:bg-ink-50"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-sm font-extrabold text-ink-900">
                              {ticket.subject}
                            </strong>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              ticket.status === "OPEN" ? "bg-danger-soft text-danger" :
                              ticket.status === "RESOLVED" ? "bg-success-soft text-success" :
                              "bg-primary-soft text-primary-700"
                            }`}>
                              {ticket.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                            {ticket.description}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-400">
                            {ticket.category && (
                              <span className="rounded-full bg-ink-100 px-2 py-0.5 font-bold">
                                {ticket.category}
                              </span>
                            )}
                            <span>
                              {new Date(ticket.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === "detail" && selected && detail && (
              <div className="mx-auto max-w-3xl">
                <button
                  type="button"
                  onClick={() => setStep("tickets")}
                  className="mb-4 text-sm font-bold text-brand-700 hover:text-brand-800"
                >
                  ← Back to tickets
                </button>

                <div className="rounded-2xl border border-ink-100 bg-ink-50 p-8 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-ink-900">
                        {selected.subject}
                      </h2>
                      <p className="mt-1 text-xs text-ink-500">
                        #{selected.id} — Status: {selected.status.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      selected.status === "OPEN" ? "bg-danger-soft text-danger" :
                      selected.status === "RESOLVED" ? "bg-success-soft text-success" :
                      "bg-primary-soft text-primary-700"
                    }`}>
                      {selected.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-extrabold text-ink-900">Description</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                      {selected.description}
                    </p>
                  </div>

                  {detail.data.replies && detail.data.replies.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-extrabold text-ink-900">
                        Replies ({detail.data.replies.length})
                      </h3>
                      <div className="mt-2 space-y-3">
                        {detail.data.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className={`rounded-lg border p-3 ${
                              reply.isStaffReply
                                ? "border-primary-200 bg-primary-50/30"
                                : "border-ink-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-ink-900">
                                {reply.userName} ({reply.userRole})
                              </span>
                              <span className="text-[10px] text-ink-400">
                                {new Date(reply.createdAt).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-ink-700">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

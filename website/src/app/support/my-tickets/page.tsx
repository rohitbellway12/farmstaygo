"use client";

import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import {
  fetchPublicSupportTicketsByEmail,
  fetchPublicSupportTicketById,
  type PublicSupportTicket,
  type PublicSupportTicketResponse,
} from "@/types/support";

export default function MyTicketsPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [tickets, setTickets] = useState<PublicSupportTicket[]>([]);
  const [selected, setSelected] = useState<PublicSupportTicket | null>(null);
  const [detail, setDetail] = useState<PublicSupportTicketResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");

  useEffect(() => {
    const authData = localStorage.getItem("farmstaygo_customer_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        const user = parsed?.data?.user;
        if (user?.email) {
          setLookupEmail(user.email);
          void loadTickets(user.email);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const emailParam = searchParams.get("email");
    if (tab === "tickets" && emailParam) {
      setLookupEmail(emailParam);
      void loadTickets(emailParam);
    }
  }, [searchParams]);

  const loadTickets = async (emailAddress: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchPublicSupportTicketsByEmail(emailAddress);
      setTickets(response.data || []);
      setEmail(emailAddress);
    } catch {
      setError("Unable to load tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    void loadTickets(lookupEmail.trim());
  };

  const handleViewTicket = async (ticket: PublicSupportTicket) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetchPublicSupportTicketById(ticket.id);
      setDetail(response);
      setSelected(ticket);
    } catch {
      setError("Unable to load ticket details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-spacing">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-ink-100 bg-ink-50 p-8 shadow-sm sm:p-10">
            <h1 className="text-2xl font-extrabold text-ink-900">
              My Support Tickets
            </h1>
            <p className="mt-2 text-sm text-ink-500">
              View and track your support requests.
            </p>

            <form onSubmit={handleLookup} className="mt-6 flex gap-3">
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="Enter your email address"
                className="h-12 flex-1 rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-lg bg-brand-700 px-6 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:opacity-60"
              >
                {loading ? "Loading..." : "Search"}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                {error}
              </div>
            )}

            {tickets.length > 0 && (
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

            {tickets.length === 0 && !loading && email && (
              <div className="mt-6 text-center">
                <p className="text-sm text-ink-500">No tickets found for this email.</p>
              </div>
            )}

            {selected && detail && (
              <div className="mt-8 rounded-lg border border-ink-200 bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-ink-900">
                      {selected.subject}
                    </h2>
                    <p className="mt-1 text-xs text-ink-500">
                      #{selected.id} — Status: {selected.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setDetail(null);
                    }}
                    className="text-xs font-bold text-brand-700 hover:text-brand-800"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-extrabold text-ink-900">Description</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                    {selected.description}
                  </p>
                </div>

                {detail.data.replies && detail.data.replies.length > 0 && (
                  <div className="mt-4">
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
                              : "border-ink-200 bg-ink-50"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

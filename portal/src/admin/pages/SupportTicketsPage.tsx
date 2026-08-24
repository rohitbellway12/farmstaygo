import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  addSupportTicketReply,
  deleteSupportTicket,
  fetchSupportTicketById,
  fetchSupportTicketStats,
  fetchSupportTickets,
  updateSupportTicket,
} from "../../shared/api/supportTicketApi";

import type {
  SupportTicket,
  SupportTicketsResponse,
} from "../../shared/api/supportTicketApi";

interface ToastState {
  type: "success" | "error";
  message: string;
}

interface TicketDetailModalProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  onUpdate: (ticket: SupportTicket) => void;
}

function TicketDetailModal({
  ticket,
  onClose,
  onUpdate,
}: TicketDetailModalProps) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(ticket?.status ?? "OPEN");
  const [priority, setPriority] = useState(ticket?.priority ?? "MEDIUM");
  const [assignedToId, setAssignedToId] = useState<string>(
    ticket?.assignedToId?.toString() ?? ""
  );
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setPriority(ticket.priority);
      setAssignedToId(ticket.assignedToId?.toString() ?? "");
    }
  }, [ticket]);

  const handleSendReply = async () => {
    if (!ticket || !reply.trim()) return;
    try {
      setSending(true);
      await addSupportTicketReply(ticket.id, reply.trim());
      const updated = await fetchSupportTicketById(ticket.id);
      onUpdate(updated.data);
      setReply("");
    } catch (error) {
      console.error("Send reply error:", error);
    } finally {
      setSending(false);
    }
  };

  const handleUpdate = async () => {
    if (!ticket) return;
    try {
      setUpdating(true);
      const response = await updateSupportTicket(ticket.id, {
        status,
        priority,
        assignedToId: assignedToId ? parseInt(assignedToId, 10) : null,
      });
      onUpdate(response.data);
    } catch (error) {
      console.error("Update ticket error:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (!ticket) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-dashboard-card border border-border bg-surface shadow-dashboard-dropdown"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              {ticket.subject}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              #{ticket.id} — {ticket.userName} ({ticket.userEmail})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 6 12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-text-secondary">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary">
                Assign To
              </label>
              <input
                type="number"
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                placeholder="User ID"
                className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={updating}
                className="h-10 rounded-control bg-primary-700 px-4 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-50"
              >
                {updating ? "Updating..." : "Update Ticket"}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-text-main">
              Description
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
              {ticket.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-text-main">
              Replies ({ticket.replies?.length ?? 0})
            </h3>
            <div className="mt-2 space-y-3">
              {ticket.replies?.length === 0 && (
                <p className="text-xs text-text-muted">No replies yet.</p>
              )}
              {ticket.replies?.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-control border p-3 ${
                    r.isStaffReply
                      ? "border-primary-200 bg-primary-50/30"
                      : "border-border bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-main">
                      {r.userName} ({r.userRole})
                    </span>
                    <span className="text-[10px] text-text-soft">
                      {new Date(r.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {r.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
              className="flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
            <button
              type="button"
              onClick={handleSendReply}
              disabled={sending || !reply.trim()}
              className="self-end rounded-control bg-primary-700 px-4 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Reply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const colors: Record<string, string> = {
    OPEN: "bg-danger-soft text-danger",
    IN_PROGRESS: "bg-primary-soft text-primary-700",
    WAITING_ON_CUSTOMER: "bg-yellow-100 text-yellow-700",
    RESOLVED: "bg-success-soft text-success",
    CLOSED: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
        colors[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  const colors: Record<string, string> = {
    LOW: "bg-gray-100 text-gray-600",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-danger-soft text-danger",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
        colors[priority] || "bg-gray-100 text-gray-600"
      }`}
    >
      {priority}
    </span>
  );
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    open: number;
    inProgress: number;
    waiting: number;
    resolved: number;
    closed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response: SupportTicketsResponse = await fetchSupportTickets({
        page,
        limit: 20,
        status: statusFilter,
        priority: priorityFilter,
        search: search || undefined,
      });

      setTickets(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      setPageError(
        axios.isAxiosError(error)
          ? error.response?.data?.message || "Unable to load support tickets."
          : "Unable to load support tickets."
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, search]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetchSupportTicketStats();
      setStats(response.data);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void loadStats();
  }, [loadStats, page, statusFilter]);

  const handleView = async (ticket: SupportTicket) => {
    try {
      const updated = await fetchSupportTicketById(ticket.id);
      setSelected(updated.data);
    } catch (error) {
      console.error("Fetch ticket detail error:", error);
    }
  };

  const handleDelete = async (ticket: SupportTicket) => {
    if (!window.confirm(`Delete ticket "${ticket.subject}"?`)) return;

    try {
      await deleteSupportTicket(ticket.id);
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      if (selected?.id === ticket.id) {
        setSelected(null);
      }
      setToast({
        type: "success",
        message: "Ticket deleted.",
      });
      void loadStats();
    } catch (error) {
      setToast({
        type: "error",
        message: axios.isAxiosError(error)
          ? error.response?.data?.message || "Unable to delete ticket."
          : "Unable to delete ticket.",
      });
    }
  };

  const handleUpdateSelected = (updated: SupportTicket) => {
    setSelected(updated);
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed right-5 top-20 z-[90] flex max-w-sm items-start gap-3 rounded-dashboard-card border px-4 py-3 shadow-dashboard-dropdown ${
            toast.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          <span
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${
              toast.type === "success" ? "bg-success" : "bg-danger"
            }`}
          >
            {toast.type === "success" ? "✓" : "!"}
          </span>
          <p className="text-sm font-semibold">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 6 12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">
              Support Tickets
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Manage customer and vendor support requests.
            </p>
          </div>
        </div>
      </section>

      {stats && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total", value: stats.total, color: "bg-primary-50 text-primary-700" },
            { label: "Open", value: stats.open, color: "bg-danger-soft text-danger" },
            { label: "In Progress", value: stats.inProgress, color: "bg-primary-soft text-primary-700" },
            { label: "Waiting", value: stats.waiting, color: "bg-yellow-100 text-yellow-700" },
            { label: "Resolved", value: stats.resolved, color: "bg-success-soft text-success" },
            { label: "Closed", value: stats.closed, color: "bg-gray-100 text-gray-600" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-dashboard-card border p-3 shadow-dashboard-card ${stat.color}`}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="mt-1 text-xl font-extrabold">{stat.value}</p>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by subject, name or email..."
              className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-control border border-border bg-surface px-3 text-xs font-bold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_ON_CUSTOMER">Waiting on Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-control border border-border bg-surface px-3 text-xs font-bold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </section>

      {pageError && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {pageError}
        </div>
      )}

      <section className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-dashboard-card bg-surface-muted"
              />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <section className="rounded-dashboard-card border border-border bg-surface p-10 text-center shadow-dashboard-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
              </svg>
            </span>
            <h3 className="mt-4 text-base font-extrabold text-text-main">
              No support tickets found
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try changing the search or filters."
                : "New tickets will appear here once created."}
            </p>
          </section>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`group flex items-start justify-between gap-4 rounded-dashboard-card border p-4 shadow-dashboard-card transition hover:bg-surface-muted ${
                ticket.status === "OPEN"
                  ? "border-primary-200 bg-primary-50/30"
                  : "border-border bg-surface"
              }`}
            >
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => handleView(ticket)}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="block text-sm font-extrabold text-text-main">
                    {ticket.subject}
                  </strong>
                  <div className="flex shrink-0 gap-1.5">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </div>
                <p className="mt-1 text-xs font-bold text-text-secondary">
                  {ticket.userName} — {ticket.userEmail}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                  {ticket.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-text-soft">
                  {ticket.category && (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 font-bold">
                      {ticket.category}
                    </span>
                  )}
                  <span>Replies: {ticket._count?.replies ?? ticket.replies?.length ?? 0}</span>
                  {ticket.assignedTo && (
                    <span>
                      Assigned: {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                    </span>
                  )}
                  <span>
                    {new Date(ticket.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleView(ticket)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-text-secondary opacity-0 transition group-hover:opacity-100 hover:bg-surface-muted"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(ticket)}
                  className="rounded-lg border border-danger/30 bg-surface px-2.5 py-1.5 text-xs font-bold text-danger opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-ink-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {selected && (
        <TicketDetailModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdateSelected}
        />
      )}
    </div>
  );
}

import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fetchContactMessages,
  markContactMessageRead,
  markAllContactMessagesRead,
  deleteContactMessage,
  fetchUnreadContactMessageCount,
} from "../../shared/api/contactApi";

import type {
  ContactMessage,
  ContactMessagesResponse,
} from "../../shared/api/contactApi";

interface ToastState {
  type: "success" | "error";
  message: string;
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 9a2 2 0 0 0 0 4v6h16v-6a2 2 0 0 0 0-4V5H4Z" />
      <path d="M9 5v14" />
    </svg>
  );
}

function SearchIcon() {
  return (
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
  );
}

function CloseIcon() {
  return (
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
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
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
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.14.93.36 1.84.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.97.34 1.88.56 2.81.7a2 2 0 0 1 1.72 2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

const formatDate = (value?: string | null): string => {
  if (!value) return "Not available";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime()))
    return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallbackMessage
    );
  }
  return fallbackMessage;
};

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "read" | "unread">(
    "all"
  );
  const [toast, setToast] = useState<ToastState | null>(
    null
  );
  const [selected, setSelected] =
    useState<ContactMessage | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response: ContactMessagesResponse =
        await fetchContactMessages({
          page,
          limit: 20,
          filter,
          search: search || undefined,
        });

      setMessages(response.data);
      setTotalPages(
        response.pagination.totalPages
      );
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load contact messages."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  const refreshUnreadCount = useCallback(async () => {
    try {
      await fetchUnreadContactMessageCount();
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleMarkRead = async (
    message: ContactMessage
  ) => {
    try {
      const updated = await markContactMessageRead(
        message.id,
        !message.isRead
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, isRead: updated.data.isRead }
            : m
        )
      );

      if (selected?.id === message.id) {
        setSelected(updated.data);
      }

      setToast({
        type: "success",
        message: updated.data.isRead
          ? "Marked as read"
          : "Marked as unread",
      });

      void refreshUnreadCount();
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to update message."
        ),
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (!window.confirm("Mark all messages as read?")) {
      return;
    }

    try {
      const response = await markAllContactMessagesRead();

      setMessages((prev) =>
        prev.map((m) => ({ ...m, isRead: true }))
      );

      setToast({
        type: "success",
        message: `${response.data.count} messages marked as read.`,
      });

      void refreshUnreadCount();
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to mark messages as read."
        ),
      });
    }
  };

  const handleDelete = async (message: ContactMessage) => {
    if (
      !window.confirm(
        `Delete message from ${message.name}?`
      )
    ) {
      return;
    }

    try {
      await deleteContactMessage(message.id);

      setMessages((prev) =>
        prev.filter((m) => m.id !== message.id)
      );

      if (selected?.id === message.id) {
        setSelected(null);
      }

      setToast({
        type: "success",
        message: "Message deleted.",
      });

      void refreshUnreadCount();
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to delete message."
        ),
      });
    }
  };

  const handleView = (message: ContactMessage) => {
    setSelected(message);
  };

  const unreadCount = messages.filter(
    (m) => !m.isRead
  ).length;

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
              toast.type === "success"
                ? "bg-success"
                : "bg-danger"
            }`}
          >
            {toast.type === "success" ? "✓" : "!"}
          </span>
          <p className="text-sm font-semibold">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <MessageIcon />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">
              Contact Messages
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Messages submitted through the website contact
              form.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted"
            >
              Mark All As Read
            </button>
          )}
        </div>
      </section>

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email or subject..."
              className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div className="flex gap-2">
            {(["all", "unread", "read"] as const).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    filter === f
                      ? "bg-primary-700 text-white"
                      : "border border-border bg-surface text-text-secondary hover:bg-surface-muted"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === "unread" && unreadCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {pageError && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {pageError}
        </div>
      )}

      <section className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-dashboard-card bg-surface-muted"
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <section className="rounded-dashboard-card border border-border bg-surface p-10 text-center shadow-dashboard-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
              <MessageIcon />
            </span>
            <h3 className="mt-4 text-base font-extrabold text-text-main">
              No contact messages found
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {search || filter !== "all"
                ? "Try changing the search or filters."
                : "New messages will appear here once submitted."}
            </p>
          </section>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`group flex items-start justify-between gap-4 rounded-dashboard-card border p-4 shadow-dashboard-card transition hover:bg-surface-muted ${
                message.isRead
                  ? "border-border bg-surface"
                  : "border-primary-200 bg-primary-50/30"
              }`}
            >
              <div className="min-w-0 flex-1 cursor-pointer"
                onClick={() => handleView(message)}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="block text-sm font-extrabold text-text-main">
                    {message.name || "No name"}
                  </strong>

                  {!message.isRead && (
                    <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[9px] font-extrabold text-white">
                      New
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs font-bold text-text-secondary">
                  {message.subject || "No subject"}
                </p>

                <p className="mt-2 line-clamp-2 text-xs text-text-muted">
                  {message.message}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-text-soft">
                  <span className="flex items-center gap-1">
                    <MailIcon />
                    {message.email}
                  </span>
                  {message.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneIcon />
                      {message.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarIcon />
                    {formatDate(message.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleMarkRead(message)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-bold text-text-secondary opacity-0 transition group-hover:opacity-100 hover:bg-surface-muted"
                  title={
                    message.isRead
                      ? "Mark as unread"
                      : "Mark as read"
                  }
                >
                  {message.isRead ? "Unread" : "Read"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(message)}
                  className="rounded-lg border border-danger/30 bg-surface px-2.5 py-1.5 text-xs font-bold text-danger opacity-0 transition group-hover:opacity-100 hover:bg-danger-soft"
                  title="Delete"
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
            onClick={() =>
              setPage((p) => Math.max(1, p - 1))
            }
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
            onClick={() =>
              setPage((p) =>
                Math.min(totalPages, p + 1)
              )
            }
            disabled={page >= totalPages}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

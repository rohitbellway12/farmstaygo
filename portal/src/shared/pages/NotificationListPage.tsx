import { useEffect, useState, useCallback } from "react";

import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../api/notificationApi";

import type { Notification } from "../api/notificationApi";

export default function NotificationListPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetchNotifications({
        page,
        limit: 20,
        filter,
        search,
      });

      setNotifications(res.data);
      setTotalPages(res.pagination.totalPages);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await fetchUnreadCount();
      setUnreadCount(res.data.count);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        )
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );

      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  const handleFilterChange = (
    newFilter: string
  ) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleSearch = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="site-container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">
              Notifications
            </h1>

            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-text-secondary">
                {unreadCount} unread notification
                {unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-bold text-text-main shadow-sm hover:bg-surface-soft"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder="Search notifications..."
              value={search}
              onChange={handleSearch}
              className="h-10 w-full rounded-control border border-border bg-white px-4 pr-10 text-sm text-text-main outline-none placeholder:text-text-muted focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div className="flex gap-2">
            {["all", "unread", "booking", "payment"].map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    handleFilterChange(f)
                  }
className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                      filter === f
                        ? "bg-primary-700 text-white"
                        : "border border-border bg-white text-text-secondary hover:bg-surface-soft"
                    }`}
                >
                  {f.charAt(0).toUpperCase() +
                    f.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-white shadow-sm">
          {loading ? (
<div className="py-12 text-center text-sm text-text-muted">
               Loading notifications...
             </div>
           ) : notifications.length === 0 ? (
             <div className="py-12 text-center text-sm text-text-muted">
              No notifications found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() =>
                    handleMarkAsRead(n.id)
                  }
                  className={`block w-full px-6 py-4 text-left transition hover:bg-surface-soft ${
                    !n.isRead
                      ? "bg-primary-50/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-text-main">
                          {n.title}
                        </h3>

                        {!n.isRead && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-primary-600" />
                        )}
                      </div>

                      <p className="mt-1 text-sm text-ink-600">
                        {n.message}
                      </p>

                      <span className="mt-2 block text-xs text-ink-400">
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              disabled={page <= 1}
              className="rounded-lg border border-ink-100 bg-white px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40"
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
              className="rounded-lg border border-ink-100 bg-white px-4 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
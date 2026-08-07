import { useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";

import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../api/notificationApi";

import type { Notification } from "../api/notificationApi";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] =
    useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const res = await fetchUnreadCount();

        if (!cancelled) {
          setUnreadCount(res.data.count);
        }
      } catch {
        // Silently fail
      }
    };

    void loadUnreadCount();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dropdownOpen) {
      return;
    }

    let cancelled = false;

    const loadRecent = async () => {
      try {
        const res = await fetchNotifications({
          page: 1,
          limit: 8,
          filter: "all",
        });

        if (!cancelled) {
          setRecentNotifications(res.data);
        }
      } catch {
        // Silently fail
      }
    };

    void loadRecent();

    return () => {
      cancelled = true;
    };
  }, [dropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleMarkAsRead = async (
    id: string
  ) => {
    try {
      await markNotificationAsRead(id);

      setRecentNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, isRead: true }
            : n
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

      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );

      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d ago`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() =>
          setDropdownOpen((v) => !v)
        }
        className="relative grid h-9 w-9 place-items-center rounded-lg text-text-secondary hover:bg-surface-muted"
        aria-label="Notifications"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[19px] w-[19px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[8px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-dashboard-card border border-border bg-surface shadow-dashboard-dropdown">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-[12px] font-extrabold text-text-main">
              Notifications
            </h3>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-bold text-brand-700 hover:text-brand-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-text-muted">
                No notifications yet
              </div>
            ) : (
              recentNotifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() =>
                    handleMarkAsRead(n.id)
                  }
                  className={`block w-full px-4 py-3 text-left transition hover:bg-surface-muted ${
                    !n.isRead
                      ? "bg-primary-50/50"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-text-main">
                        {n.title}
                      </p>

                      <p className="mt-0.5 text-[10px] text-text-muted leading-relaxed">
                        {n.message}
                      </p>
                    </div>

                    {!n.isRead && (
                      <span className="mt-1 shrink-0 h-2 w-2 rounded-full bg-primary-600" />
                    )}
                  </div>

                  <span className="mt-1 block text-[9px] text-text-soft">
                    {formatTime(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border px-4 py-2">
            <NavLink
              to="/admin/notifications"
              onClick={() => setDropdownOpen(false)}
              className="block text-center text-[11px] font-bold text-brand-700 hover:text-brand-800"
            >
              View all notifications
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}
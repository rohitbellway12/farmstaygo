import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  clearAuth,
  getAuth,
} from "../../shared/utils/auth";
import api from "../../shared/api/api";
import NotificationBell from "../../shared/components/NotificationBell";

interface MenuItem {
  label: string;
  path: string;
  icon: ReactNode;
  badge?: string;
  badgeKey?:
    | "vendors"
    | "propertyApprovals"
    | "properties"
    | "contactMessages"
    | "supportTickets";
  badgeType?: "success" | "danger";
  end?: boolean;
}

interface AdminSidebarCounts {
  vendors: number;
  propertyApprovals: number;
  properties: number;
  contactMessages: number;
  supportTickets: number;
}

const iconClass = "h-[17px] w-[17px] shrink-0";

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    end: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </svg>
    ),
  },
  {
    label: "Vendors",
    path: "/admin/vendors",
    badgeKey: "vendors",
    badgeType: "success",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 21h18" />
        <path d="M5 21V9l7-5 7 5v12" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    label: "Property Approvals",
    path: "/admin/property-approvals",
    badgeKey: "propertyApprovals",
    badgeType: "danger",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 21h18" />
        <path d="M6 21V8l6-4 6 4v13" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
  label: "Property Categories",
  path: "/admin/property-categories",
  icon: (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </svg>
  ),
},

{
  label: "Amenities",
  path: "/admin/amenities",
  icon: (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="m4.22 4.22 2.12 2.12" />
      <path d="m17.66 17.66 2.12 2.12" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m4.22 19.78 2.12-2.12" />
      <path d="m17.66 6.34 2.12-2.12" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
},

{
  label: "Service Cities",
  path: "/admin/service-cities",
  icon: (
    <svg
      viewBox="0 0 24 24"
      className={iconClass}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
},

  {
    label: "Properties",
    path: "/admin/properties",
    badgeKey: "properties",
    badgeType: "success",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
        <path d="M9 13h6" />
      </svg>
    ),
  },
  {
    label: "Bookings",
    path: "/admin/bookings",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Payments",
    path: "/admin/payments",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    ),
  },
  {
    label: "Commissions",
    path: "/admin/commissions",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="16" r="3" />
        <path d="m18 6-12 12" />
      </svg>
    ),
  },
  {
    label: "Contact Messages",
    path: "/admin/contact-messages",
    badgeKey: "contactMessages",
    badgeType: "danger",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 9a2 2 0 0 0 0 4v6h16v-6a2 2 0 0 0 0-4V5H4Z" />
        <path d="M9 5v14" />
      </svg>
    ),
  },
  {
    label: "CMS",
    path: "/admin/cms",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M7 8h10" />
        <path d="M7 12h6" />
        <path d="M7 16h8" />
      </svg>
    ),
    },
    {
      label: "Blog",
      path: "/admin/blog",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      ),
    },
    {
      label: "Reports",
      path: "/admin/reports",
      icon: (
        <svg
          viewBox="0 0 24 24"
          className={iconClass}
          fill="none"
          stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 19V9" />
        <path d="M10 19V5" />
        <path d="M15 19v-7" />
        <path d="M20 19V3" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    path: "/admin/analytics",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m4 17 5-5 4 3 7-9" />
        <path d="M4 21h16" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    path: "/admin/notifications",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    ),
  },
  {
    label: "Support Tickets",
    path: "/admin/support",
    badgeKey: "supportTickets",
    badgeType: "danger",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    path: "/admin/settings",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className={iconClass}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4" />
        <path d="M9 4.6A1.7 1.7 0 0 0 8 4l-.9-.1a2 2 0 1 0-2.8 2.8l.1.9A1.7 1.7 0 0 0 4.6 9" />
      </svg>
    ),
  },
];

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Users",
  "/admin/vendors": "Vendors",
  "/admin/property-approvals": "Property Approvals",
  "/admin/property-categories": "Property Categories",
  "/admin/amenities": "Amenities",
  "/admin/service-cities": "Service Cities",
  "/admin/properties": "Properties",
  "/admin/bookings": "Bookings",
  "/admin/payments": "Payments",
  "/admin/commissions": "Commissions",
  "/admin/contact-messages": "Contact Messages",
  "/admin/cms": "CMS",
  "/admin/cms/new": "Create CMS Page",
  "/admin/blog": "Blog",
  "/admin/blog/new": "New Blog Post",
  "/admin/reports": "Reports",
  "/admin/analytics": "Analytics",
  "/admin/notifications": "Notifications",
  "/admin/support": "Support Tickets",
  "/admin/settings": "Settings",
};

const menuGroups = [
  {
    title: "Overview",
    paths: ["/admin/dashboard"],
  },
  {
    title: "People",
    paths: ["/admin/users", "/admin/vendors"],
  },
  {
    title: "Listings",
    paths: [
      "/admin/property-approvals",
      "/admin/properties",
      "/admin/property-categories",
      "/admin/amenities",
      "/admin/service-cities",
    ],
  },
  {
    title: "Operations",
    paths: [
      "/admin/bookings",
      "/admin/payments",
      "/admin/commissions",
      "/admin/contact-messages",
    ],
  },
  {
    title: "Content",
    paths: ["/admin/cms", "/admin/blog", "/admin/notifications"],
  },
  {
    title: "Insights",
    paths: ["/admin/reports", "/admin/analytics"],
  },
  {
    title: "System",
    paths: ["/admin/support", "/admin/settings"],
  },
].map((group) => ({
  ...group,
  items: group.paths
    .map((path) =>
      menuItems.find((item) => item.path === path)
    )
    .filter((item): item is MenuItem => Boolean(item)),
}));

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCounts, setSidebarCounts] =
    useState<AdminSidebarCounts>({
      vendors: 0,
      propertyApprovals: 0,
      properties: 0,
      contactMessages: 0,
      supportTickets: 0,
    });

  useEffect(() => {
    let cancelled = false;

    const loadSidebarCounts = async () => {
      try {
        const [
          vendorsResponse,
          propertyApprovalsResponse,
          propertiesResponse,
          contactMessagesResponse,
          supportTicketsResponse,
        ] = await Promise.all([
          api.get<{
            total: number;
          }>("/admin/vendors"),
          api.get<{
            total: number;
            statistics?: {
              pending?: number;
            };
          }>("/admin/property-approvals", {
            params: {
              status: "PENDING_APPROVAL",
            },
          }),
          api.get<{
            statistics?: {
              total?: number;
            };
            total: number;
          }>("/admin/properties", {
            params: {
              status: "ALL",
            },
          }),
          api.get<{
            data: { count: number };
          }>("/admin/contact-messages/unread-count"),
          api.get<{
            data: { total: number };
          }>("/admin/support-tickets/stats"),
        ]);

        if (cancelled) {
          return;
        }

        setSidebarCounts({
          vendors:
            vendorsResponse.data.total || 0,
          propertyApprovals:
            propertyApprovalsResponse.data.statistics?.pending ||
            propertyApprovalsResponse.data.total ||
            0,
          properties:
            propertiesResponse.data.statistics?.total ||
            propertiesResponse.data.total ||
            0,
          contactMessages:
            contactMessagesResponse.data.data.count || 0,
          supportTickets:
            supportTicketsResponse.data.data.total || 0,
        });
      } catch {
        if (!cancelled) {
          setSidebarCounts({
            vendors: 0,
            propertyApprovals: 0,
            properties: 0,
            contactMessages: 0,
            supportTickets: 0,
          });
        }
      }
    };

    void loadSidebarCounts();
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

const currentTitle = useMemo(() => {
  if (
    location.pathname.startsWith(
      "/admin/property-approvals/"
    )
  ) {
    return "Property Review";
  }

  return (
    pageTitles[location.pathname] ||
    "Administration"
  );
}, [location.pathname]);

  const fullName = [
    auth?.user.firstName,
    auth?.user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = [
    auth?.user.firstName?.charAt(0),
    auth?.user.lastName?.charAt(0),
  ]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const logout = () => {
    clearAuth();
    navigate("/admin/login", { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar-bg">
      <div className="flex h-[67px] items-center border-b border-border px-5">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9 21v-7h6v7" />
            </svg>
          </span>

          <span className="text-left">
            <strong className="block text-[18px] font-extrabold leading-none text-primary-700">
              FarmStayGo
            </strong>

            <small className="mt-1 block text-[8px] font-extrabold uppercase tracking-[0.22em] text-primary-500">
              Stays That Connect
            </small>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-lg p-2 text-text-muted lg:hidden"
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

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-4">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-soft">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        "group flex min-h-[37px] items-center gap-3 rounded-[9px] px-3 text-[12px] font-semibold transition",
                        isActive
                          ? "bg-sidebar-active text-primary-700"
                          : "text-text-secondary hover:bg-sidebar-hover hover:text-primary-700",
                      ].join(" ")
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={
                            isActive
                              ? "text-primary-700"
                              : "text-text-muted group-hover:text-primary-700"
                          }
                        >
                          {item.icon}
                        </span>

                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>

                        {(item.badge ||
                          (item.badgeKey &&
                            sidebarCounts[item.badgeKey] > 0)) && (
                          <span
                            className={
                              item.badgeType === "danger"
                                ? "rounded-full bg-danger-soft px-2 py-0.5 text-[9px] font-extrabold text-danger"
                                : "rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-extrabold text-success"
                            }
                          >
                            {item.badge ||
                              (item.badgeKey
                                ? sidebarCounts[item.badgeKey]
                                : "")}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[224px] border-r border-border bg-sidebar-bg lg:block">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] border-r border-border bg-sidebar-bg shadow-dashboard-dropdown transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      <div className="min-h-screen lg:pl-[224px]">
        <header className="sticky top-0 z-30 flex h-[67px] items-center border-b border-border bg-header-bg px-4 shadow-dashboard-header sm:px-5">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-3 rounded-lg p-2 text-text-muted hover:bg-surface-muted lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>

          <div className="hidden lg:block">
            <button
              type="button"
              className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="relative ml-2 hidden w-full max-w-[480px] md:block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
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
              placeholder="Search users, bookings, properties, vendors..."
              className="h-10 w-full rounded-control border border-border bg-surface px-10 pr-12 text-[11px] text-text-main outline-none placeholder:text-text-soft focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
            />

            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[9px] font-bold text-text-soft">
              ⌘ K
            </span>
          </div>

          <span className="truncate text-sm font-bold text-text-main md:hidden">
            {currentTitle}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />

             <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-surface-muted"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-100 text-[10px] font-extrabold text-primary-700">
                  {initials || "A"}
                </span>

                <span className="hidden text-left lg:block">
                  <strong className="block text-[11px] font-extrabold text-text-main">
                    {auth?.user.firstName || "Admin"}
                  </strong>

                  <small className="block text-[9px] text-text-muted">
                    Super Admin
                  </small>
                </span>

                <svg
                  viewBox="0 0 24 24"
                  className={`h-3.5 w-3.5 text-text-muted transition ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-60 rounded-dashboard-card border border-border bg-surface p-2 shadow-dashboard-dropdown">
                  <div className="border-b border-border px-3 py-3">
                    <strong className="block text-[12px] text-text-main">
                      {fullName || "Administrator"}
                    </strong>

                    <span className="mt-1 block truncate text-[10px] text-text-muted">
                      {auth?.user.email}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/admin/settings")}
                    className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    Profile Settings
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="block w-full rounded-lg px-3 py-2 text-left text-[11px] font-bold text-danger hover:bg-danger-soft"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-67px)] p-3 sm:p-4 lg:p-[18px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

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
import NotificationBell from "../../shared/components/NotificationBell";

import api from "../../shared/api/api";

interface MenuItem {
  group: "overview" | "listings" | "operations" | "money" | "account";
  label: string;
  path: string;
  icon: ReactNode;
  badge?: string;
  badgeType?: "success" | "danger" | "info";
  verified?: boolean;
  end?: boolean;
}

const iconClass = "h-[17px] w-[17px] shrink-0";

const menuItems: MenuItem[] = [
  {
    group: "overview",
    label: "Dashboard",
    path: "/vendor/dashboard",
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    group: "listings",
    label: "My Properties",
    path: "/vendor/properties",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 21h18" />
        <path d="M5 21V9l7-5 7 5v12" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    group: "listings",
    label: "Manage Rooms",
    path: "/vendor/rooms",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="8" width="18" height="11" rx="2" />
        <path d="M7 8V6a3 3 0 0 1 6 0v2" />
        <path d="M17 8V6a2 2 0 0 0-2-2" />
        <path d="M3 14h18" />
      </svg>
    ),
  },
  {
    group: "operations",
    label: "Bookings",
    path: "/vendor/bookings",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    group: "operations",
    label: "Calendar",
    path: "/vendor/calendar",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
        <path d="M8 14h2" />
        <path d="M14 14h2" />
      </svg>
    ),
  },
  {
    group: "operations",
    label: "Calendar Sync",
    path: "/vendor/calendar-sync",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0Z" />
        <path d="M12 8v4l2 2" />
        <path d="M17 8l5 4-5 8" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    group: "money",
    label: "Earnings",
    path: "/vendor/earnings",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 15.5c1 .8 2.3 1.2 4 1.2 2 0 3.3-1 3.3-2.4 0-1.3-1-2-3.3-2.5-2-.4-3.1-1.1-3.1-2.4 0-1.4 1.3-2.4 3.2-2.4 1.4 0 2.6.4 3.4 1.1" />
        <path d="M12 5.7v12.6" />
      </svg>
    ),
  },
  {
    group: "money",
    label: "Payouts",
    path: "/vendor/payouts",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    ),
  },
  {
    group: "account",
    label: "KYC & Bank Details",
    path: "/vendor/kyc-bank",
    verified: true,
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 10h18" />
        <path d="M5 10v9" />
        <path d="M9 10v9" />
        <path d="M15 10v9" />
        <path d="M19 10v9" />
        <path d="M2 21h20" />
        <path d="m12 3 9 5H3Z" />
      </svg>
    ),
  },
  {
    group: "account",
    label: "Notifications",
    path: "/vendor/notifications",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
    ),
  },
  {
    group: "account",
    label: "Support",
    path: "/vendor/support",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      </svg>
    ),
  },
  {
    group: "account",
    label: "Settings",
    path: "/vendor/settings",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4" />
        <path d="M9 4.6A1.7 1.7 0 0 0 8 4l-.9-.1a2 2 0 1 0-2.8 2.8l.1.9A1.7 1.7 0 0 0 4.6 9" />
      </svg>
    ),
  },
];

const pageTitles: Record<string, string> = {
  "/vendor/dashboard": "Dashboard",
  "/vendor/properties": "My Properties",
  "/vendor/properties/new": "Add Property",
  "/vendor/rooms": "Manage Rooms",
  "/vendor/bookings": "Bookings",
  "/vendor/calendar": "Calendar",
  "/vendor/calendar-sync": "Calendar Sync",
  "/vendor/pricing": "Pricing",
  "/vendor/earnings": "Earnings",
  "/vendor/payouts": "Payouts",
  "/vendor/messages": "Messages",
  "/vendor/notifications": "Notifications",
  "/vendor/reviews": "Reviews",
  "/vendor/offers": "Coupons & Offers",
  "/vendor/kyc-bank": "KYC & Bank Details",
  "/vendor/support": "Support",
  "/vendor/settings": "Settings",
};

const menuGroups: Array<{
  key: MenuItem["group"];
  label: string;
}> = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "listings",
    label: "Listing Setup",
  },
  {
    key: "operations",
    label: "Bookings",
  },
  {
    key: "money",
    label: "Money",
  },
  {
    key: "account",
    label: "Account",
  },
];

export default function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            siteLogoUrl: string | null;
            siteName: string;
          };
        }>("/public/settings/platform");

        if (res.data.success && res.data.data) {
          setSiteLogoUrl(res.data.data.siteLogoUrl);
          setSiteName(res.data.data.siteName || "");
        }
      } catch {
        // keep defaults
      }
    };

    void loadSettings();
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

 const currentTitle = useMemo(() => {
  if (
    location.pathname ===
    "/vendor/properties/new"
  ) {
    return "Add Property";
  }

  if (
    location.pathname.endsWith(
      "/rooms/new"
    )
  ) {
    return "Add Room Type";
  }

  if (
    location.pathname.includes(
      "/rooms/"
    ) &&
    location.pathname.endsWith(
      "/edit"
    )
  ) {
    return "Edit Room Type";
  }

  if (
    location.pathname.endsWith(
      "/rooms"
    )
  ) {
    return "Room Inventory";
  }

  if (
    location.pathname.startsWith(
      "/vendor/properties/"
    ) &&
    location.pathname.endsWith(
      "/edit"
    )
  ) {
    return "Edit Property";
  }

  return (
    pageTitles[location.pathname] ||
    "Vendor Portal"
  );
}, [location.pathname]);

  const fullName = [auth?.user.firstName, auth?.user.lastName]
    .filter(Boolean)
    .join(" ");

  const initials = [
    auth?.user.firstName?.charAt(0),
    auth?.user.lastName?.charAt(0),
  ]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const vendorCompany =
    auth?.vendor?.businessName ||
    "Vendor Account";

  const kycStatus =
    auth?.vendor?.kycStatus ||
    "NOT_SUBMITTED";

  const kycApproved =
    kycStatus === "APPROVED";

  const kycLabel =
    kycStatus === "APPROVED"
      ? "KYC Verified"
      : kycStatus === "PENDING"
      ? "KYC Pending"
      : kycStatus === "REJECTED"
      ? "KYC Rejected"
      : "KYC Required";

  const logout = () => {
    clearAuth();
    navigate("/vendor/login", { replace: true });
  };

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col bg-sidebar-bg">
      <div className="flex h-[67px] items-center border-b border-border px-5">
        <button
          type="button"
          onClick={() => navigate("/vendor/dashboard")}
          className="flex min-w-0 items-center gap-3"
        >
          {siteLogoUrl ? (
            <img
              src={siteLogoUrl}
              alt={siteName || "FarmStayGo"}
              className="h-11 w-auto rounded-xl bg-primary-50 object-contain"
            />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
                <path d="M9 21v-7h6v7" />
                <path d="M7 8.5 4 6" />
                <path d="M17 8.5 20 6" />
              </svg>
            </span>
          )}

          {!collapsed && (
            <span className="text-left">
              <strong className="sr-only">Vendor Portal</strong>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-lg p-2 text-text-muted lg:hidden"
          aria-label="Close sidebar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 6 12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-4">
          {menuGroups.map((group) => {
            const groupItems = menuItems.filter(
              (item) => item.group === group.key
            );

            if (groupItems.length === 0) {
              return null;
            }

            return (
              <div key={group.key}>
                {!collapsed && (
                  <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-soft">
                    {group.label}
                  </p>
                )}

                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const isRoomRoute =
                      item.path === "/vendor/rooms" &&
                      (location.pathname === "/vendor/rooms" ||
                        location.pathname.includes("/rooms"));

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => {
                          const active = isActive || isRoomRoute;

                          return [
                            "group flex min-h-[37px] items-center gap-3 rounded-[9px] px-3 text-[12px] font-semibold transition",
                            collapsed && "justify-center px-2",
                            active
                              ? "bg-sidebar-active text-primary-700"
                              : "text-text-secondary hover:bg-sidebar-hover hover:text-primary-700",
                          ].join(" ");
                        }}
                      >
                        {({ isActive }) => {
                          const active = isActive || isRoomRoute;

                          return (
                            <>
                              <span
                                className={
                                  active
                                    ? "text-primary-700"
                                    : "text-text-muted group-hover:text-primary-700"
                                }
                              >
                                {item.icon}
                              </span>

                              {!collapsed && (
                                <>
                                  <span className="min-w-0 flex-1 truncate">
                                    {item.label}
                                  </span>

                                  {item.badge && (
                                    <span
                                      className={
                                        item.badgeType === "danger"
                                          ? "rounded-full bg-danger-soft px-2 py-0.5 text-[9px] font-extrabold text-danger"
                                          : item.badgeType === "info"
                                            ? "rounded-full bg-info-soft px-2 py-0.5 text-[9px] font-extrabold text-info"
                                            : "rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-extrabold text-success"
                                      }
                                    >
                                      {item.badge}
                                    </span>
                                  )}

                                  {item.verified && (
                                    <span
                                      className={
                                        active
                                          ? "grid h-5 w-5 place-items-center rounded-md bg-primary-50 text-primary-700"
                                          : "grid h-5 w-5 place-items-center rounded-md bg-success-soft text-success"
                                      }
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                      >
                                        <path d="m5 12 4 4L19 6" />
                                      </svg>
                                    </span>
                                  )}
                                </>
                              )}
                            </>
                          );
                        }}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-sidebar-bg transition-all duration-300 lg:block ${sidebarCollapsed ? "w-[68px]" : "w-[240px]"}`}>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-sidebar-bg shadow-dashboard-dropdown transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent collapsed={false} />
      </aside>

      <div
        className="min-h-screen transition-all duration-300"
        style={{ paddingLeft: sidebarCollapsed ? "68px" : "240px" }}
      >
        <header className="sticky top-0 z-30 flex h-[67px] items-center border-b border-border bg-header-bg px-4 shadow-dashboard-header sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-2 rounded-lg p-2 text-text-muted hover:bg-surface-muted lg:hidden"
            aria-label="Open sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="hidden rounded-lg p-2 text-text-muted hover:bg-surface-muted lg:block"
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>

          <span className="truncate text-base font-bold text-text-main md:hidden">{currentTitle}</span>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
            <NotificationBell />

            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className="flex items-center gap-2.5 rounded-lg border border-transparent p-1.5 hover:border-border hover:bg-surface-muted"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-100 text-sm font-extrabold text-primary-700">
                  {initials || "GS"}
                </span>

                <span className="hidden min-w-[130px] text-left xl:block">
                  <strong className="block max-w-[150px] truncate text-sm font-extrabold text-text-main">
                    {vendorCompany}
                  </strong>
                  <small className="block text-xs text-text-muted">Vendor Partner</small>
                </span>

                <span className={`hidden rounded-full px-2.5 py-1 text-xs font-extrabold 2xl:inline-flex ${
                  kycApproved
                    ? "bg-success-soft text-success"
                    : kycStatus === "PENDING"
                    ? "bg-warning-soft text-warning"
                    : "bg-danger-soft text-danger"
                }`}>
                  {kycLabel}
                </span>

                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 text-text-muted transition ${profileOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-64 rounded-dashboard-card border border-border bg-surface p-2 shadow-dashboard-dropdown">
                  <div className="border-b border-border px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="block truncate text-sm text-text-main">{vendorCompany}</strong>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                        kycApproved
                          ? "bg-success-soft text-success"
                          : kycStatus === "PENDING"
                          ? "bg-warning-soft text-warning"
                          : "bg-danger-soft text-danger"
                      }`}>{kycLabel}</span>
                    </div>
                    <span className="mt-1 block truncate text-xs text-text-muted">
                      {auth?.user.email || "vendor@farmstaygo.com"}
                    </span>
                    <span className="mt-1 block truncate text-xs text-text-soft">
                      {fullName || "Vendor Account"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/vendor/settings")}
                    className="mt-1 block w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    Profile Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/vendor/kyc-bank")}
                    className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-text-secondary hover:bg-surface-muted"
                  >
                    KYC & Bank Details
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-bold text-danger hover:bg-danger-soft"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-67px)] p-4 sm:p-5 lg:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

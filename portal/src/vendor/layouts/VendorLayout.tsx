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

interface MenuItem {
  label: string;
  path: string;
  icon: ReactNode;
  badge?: string;
  badgeType?: "success" | "danger" | "info";
  verified?: boolean;
  end?: boolean;
}

const iconClass = "h-[19px] w-[19px] shrink-0";

const menuItems: MenuItem[] = [
  {
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
    label: "Add Property",
    path: "/vendor/properties/new",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
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
    label: "Pricing",
    path: "/vendor/pricing",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 1-3 2.5s1.1 2.1 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5c-1.3 0-2.4-.4-3.2-1.2" />
        <path d="M12 6v12" />
      </svg>
    ),
  },
  {
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
    label: "Messages",
    path: "/vendor/messages",
    badge: "8",
    badgeType: "success",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
      </svg>
    ),
  },
  {
    label: "Reviews",
    path: "/vendor/reviews",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
      </svg>
    ),
  },
  {
    label: "Coupons & Offers",
    path: "/vendor/offers",
    icon: (
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 9a2 2 0 0 0 0 4v6h16v-6a2 2 0 0 0 0-4V5H4Z" />
        <path d="M9 5v14" />
      </svg>
    ),
  },
  {
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
  "/vendor/bookings": "Bookings",
  "/vendor/calendar": "Calendar",
  "/vendor/pricing": "Pricing",
  "/vendor/earnings": "Earnings",
  "/vendor/payouts": "Payouts",
  "/vendor/messages": "Messages",
  "/vendor/reviews": "Reviews",
  "/vendor/offers": "Coupons & Offers",
  "/vendor/kyc-bank": "KYC & Bank Details",
  "/vendor/settings": "Settings",
};

export default function VendorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    setAddPropertyOpen(false);
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

  const vendorCompany = "GreenStays Pvt. Ltd.";

  const logout = () => {
    clearAuth();
    navigate("/vendor/login", { replace: true });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar-bg">
      <div className="flex h-[67px] items-center border-b border-border px-5">
        <button
          type="button"
          onClick={() => navigate("/vendor/dashboard")}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9 21v-7h6v7" />
              <path d="M7 8.5 4 6" />
              <path d="M17 8.5 20 6" />
            </svg>
          </span>

          <span className="text-left">
            <strong className="block text-xl font-extrabold leading-none text-primary-700">
              FarmStayGo
            </strong>
            <small className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary-500">
              Vendor Partner
            </small>
          </span>
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

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1.5">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                [
                  "group flex min-h-[40px] items-center gap-3 rounded-[9px] px-3.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-primary-700 text-white shadow-sm"
                    : "text-text-secondary hover:bg-sidebar-hover hover:text-primary-700",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "text-white" : "text-text-muted group-hover:text-primary-700"}>
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1 truncate">{item.label}</span>

                  {item.badge && (
                    <span
                      className={
                        isActive
                          ? "rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-extrabold text-white"
                          : item.badgeType === "danger"
                          ? "rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-extrabold text-danger"
                          : item.badgeType === "info"
                          ? "rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-extrabold text-info"
                          : "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-extrabold text-success"
                      }
                    >
                      {item.badge}
                    </span>
                  )}

                  {item.verified && (
                    <span className={`grid h-5 w-5 place-items-center rounded-md ${isActive ? "bg-white/20 text-white" : "bg-success-soft text-success"}`}>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="space-y-3 p-4">
        <div className="overflow-hidden rounded-dashboard-card border border-border bg-primary-50">
          <img
            src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=500&q=80"
            alt="Farmstay"
            className="h-20 w-full object-cover"
          />
          <div className="p-4 text-center">
            <strong className="block text-sm font-extrabold text-primary-800">
              Grow your bookings
            </strong>
            <span className="mt-1 block text-xs text-text-muted">
              List more. Earn more.
            </span>
            <button
              type="button"
              onClick={() => navigate("/vendor/properties/new")}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-primary-700 px-5 text-xs font-bold text-white hover:bg-primary-800"
            >
              Add New Property
              <span>→</span>
            </button>
          </div>
        </div>

        <div className="rounded-dashboard-card border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-50 text-primary-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 13a8 8 0 0 1 16 0" />
                <path d="M4 13v5" />
                <path d="M20 13v5" />
                <path d="M4 18h3" />
                <path d="M17 18h3" />
                <path d="M9 21h6" />
              </svg>
            </span>
            <div>
              <strong className="block text-sm font-extrabold text-text-main">Need Help?</strong>
              <span className="mt-0.5 block text-xs leading-4 text-text-muted">
                Visit Help Center or contact support
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dashboard-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-border bg-sidebar-bg lg:block">
        <SidebarContent />
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
        <SidebarContent />
      </aside>

      <div className="min-h-screen lg:pl-[240px]">
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
            className="hidden rounded-lg p-2 text-text-muted hover:bg-surface-muted lg:block"
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </button>

          <div className="relative ml-2 hidden w-full max-w-[500px] md:block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
              <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search bookings, properties, guests..."
              className="h-10 w-full rounded-control border border-border bg-surface px-10 pr-12 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-300 focus:ring-4 focus:ring-primary-100"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-surface-muted px-2 py-0.5 text-xs font-bold text-text-soft">
              ⌘ K
            </span>
          </div>

          <span className="truncate text-base font-bold text-text-main md:hidden">{currentTitle}</span>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAddPropertyOpen((value) => !value)}
                className="flex h-9 items-center gap-2 rounded-lg bg-primary-700 px-4 text-xs font-bold text-white hover:bg-primary-800"
              >
                <span className="text-base leading-none">+</span>
                Add Property
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition ${addPropertyOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {addPropertyOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-dashboard-card border border-border bg-surface p-2 shadow-dashboard-dropdown">
                  <button
                    type="button"
                    onClick={() => navigate("/vendor/properties/new")}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-text-secondary hover:bg-primary-50 hover:text-primary-700"
                  >
                    Add New Property
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/vendor/properties")}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-text-secondary hover:bg-primary-50 hover:text-primary-700"
                  >
                    Manage Properties
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/vendor/pricing")}
                    className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-text-secondary hover:bg-primary-50 hover:text-primary-700"
                  >
                    Update Pricing
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="relative grid h-10 w-10 place-items-center rounded-lg text-text-secondary hover:bg-surface-muted"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>
              <span className="absolute right-1.5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">5</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/vendor/messages")}
              className="relative grid h-10 w-10 place-items-center rounded-lg text-text-secondary hover:bg-surface-muted"
              aria-label="Messages"
            >
              <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
              </svg>
              <span className="absolute right-1.5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">8</span>
            </button>

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

                <span className="hidden rounded-full bg-success-soft px-2.5 py-1 text-xs font-extrabold text-success 2xl:inline-flex">
                  KYC Verified
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
                      <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-extrabold text-success">Verified</span>
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
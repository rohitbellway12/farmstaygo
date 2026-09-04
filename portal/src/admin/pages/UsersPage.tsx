import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../shared/api/api";

type UserRole = "USER" | "VENDOR" | "ADMIN" | "STAFF_ADMIN" | "SUPPORT";
type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
type RoleFilter = "ALL" | UserRole;
type StatusFilter = "ALL" | UserStatus;

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  mobileVerified: boolean;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: number;
    businessName: string | null;
    kycStatus: string | null;
  } | null;
}

interface UserListResponse {
  success: boolean;
  message: string;
  data: AdminUser[];
  total: number;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

const roleConfig: Record<
  UserRole | "ALL",
  { label: string; badgeClass: string; dotClass: string }
> = {
  ALL: { label: "All Roles", badgeClass: "border-border bg-surface-muted text-text-secondary", dotClass: "bg-text-soft" },
  USER: { label: "Customer", badgeClass: "border-info/20 bg-info-soft text-info", dotClass: "bg-info" },
  VENDOR: { label: "Vendor", badgeClass: "border-warning/20 bg-warning-soft text-warning", dotClass: "bg-warning" },
  ADMIN: { label: "Admin", badgeClass: "border-purple/20 bg-purple-soft text-purple", dotClass: "bg-purple" },
  STAFF_ADMIN: { label: "Staff Admin", badgeClass: "border-brand-200 bg-brand-50 text-brand-700", dotClass: "bg-brand-500" },
  SUPPORT: { label: "Support", badgeClass: "border-gold-500/20 bg-gold-50 text-gold-600", dotClass: "bg-gold-500" },
};

const statusConfig: Record<
  UserStatus | "ALL",
  { label: string; badgeClass: string; dotClass: string }
> = {
  ALL: { label: "All Statuses", badgeClass: "border-border bg-surface-muted text-text-secondary", dotClass: "bg-text-soft" },
  ACTIVE: { label: "Active", badgeClass: "border-success/20 bg-success-soft text-success", dotClass: "bg-success" },
  INACTIVE: { label: "Inactive", badgeClass: "border-warning/20 bg-warning-soft text-warning", dotClass: "bg-warning" },
  BLOCKED: { label: "Blocked", badgeClass: "border-danger/20 bg-danger-soft text-danger", dotClass: "bg-danger" },
};

const formatDate = (value?: string | null): string => {
  if (!value) return "Not available";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(parsedDate);
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || error.message || fallbackMessage;
  }
  return fallbackMessage;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.14.93.36 1.84.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.97.34 1.88.56 2.81.7a2 2 0 0 1 1.72 2z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 6 12 12" /><path d="M18 6 6 18" />
    </svg>
  );
}

function StatusBadge({ config }: { config: { label: string; badgeClass: string; dotClass: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.badgeClass}`}>
      <span className={`h-2 w-2 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

function StatisticCard({ title, value, description, iconClass }: { title: string; value: number; description: string; iconClass: string }) {
  return (
    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-text-muted">{title}</span>
          <strong className="mt-2 block text-3xl font-extrabold leading-none text-text-main">{value}</strong>
          <span className="mt-2 block text-xs text-text-muted">{description}</span>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${iconClass}`}><UserIcon /></span>
      </div>
    </section>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((item) => (
        <tr key={item} className="border-b border-border last:border-b-0">
          <td className="px-5 py-4"><div className="space-y-2"><div className="h-4 w-36 animate-pulse rounded bg-surface-muted" /><div className="h-3 w-48 animate-pulse rounded bg-surface-muted" /></div></td>
          <td className="px-5 py-4"><div className="h-4 w-44 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-4 w-20 animate-pulse rounded bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-7 w-24 animate-pulse rounded-full bg-surface-muted" /></td>
          <td className="px-5 py-4"><div className="h-9 w-28 animate-pulse rounded-lg bg-surface-muted" /></td>
        </tr>
      ))}
    </>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [actionUserId, setActionUserId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await api.get<UserListResponse>("/admin/users", {
        params: {
          search: search || undefined,
          role: roleFilter === "ALL" ? undefined : roleFilter,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
      });
      setUsers(response.data.data || []);
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const statistics = useMemo(() => {
    const total = users.length;
    const customers = users.filter((u) => u.role === "USER").length;
    const vendors = users.filter((u) => u.role === "VENDOR").length;
    const admins = users.filter((u) => u.role === "ADMIN" || u.role === "STAFF_ADMIN" || u.role === "SUPPORT").length;
    const active = users.filter((u) => u.status === "ACTIVE").length;
    return { total, customers, vendors, admins, active };
  }, [users]);

  const clearFilters = () => { setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL"); };

  const updateStatus = async (user: AdminUser, status: UserStatus) => {
    try {
      setActionUserId(user.id);
      await api.patch(`/admin/users/${user.id}/status`, { status });
      setUsers((currentUsers) => currentUsers.map((currentUser) => currentUser.id === user.id ? { ...currentUser, status } : currentUser));
      setToast({ type: "success", message: `User marked ${status.toLowerCase()}.` });
    } catch (error) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Unable to update user status.") });
    } finally {
      setActionUserId(null);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    try {
      setActionUserId(user.id);
      await api.delete(`/admin/users/${user.id}`);
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
      setToast({ type: "success", message: "User deleted successfully." });
    } catch (error) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Unable to delete user.") });
    } finally {
      setActionUserId(null);
    }
  };

  const deleteTargetName = deleteTarget
    ? [deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(" ") || deleteTarget.email
    : "";

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed right-5 top-20 z-[90] flex max-w-sm items-start gap-3 rounded-dashboard-card border px-4 py-3 shadow-dashboard-dropdown ${toast.type === "success" ? "border-success/20 bg-success-soft text-success" : "border-danger/20 bg-danger-soft text-danger"}`}>
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${toast.type === "success" ? "bg-success" : "bg-danger"}`}>{toast.type === "success" ? "✓" : "!"}</span>
          <p className="text-sm font-semibold">{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100"><CloseIcon /></button>
        </div>
      )}

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700"><UserIcon /></span>
          <div>
            <h1 className="text-2xl font-extrabold text-text-main">Users</h1>
            <p className="mt-1 text-sm text-text-muted">Manage customers and platform users.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard title="Total Users" value={statistics.total} description="All registered users" iconClass="bg-info-soft text-info" />
        <StatisticCard title="Customers" value={statistics.customers} description="Registered customers" iconClass="bg-success-soft text-success" />
        <StatisticCard title="Vendors" value={statistics.vendors} description="Registered vendors" iconClass="bg-warning-soft text-warning" />
        <StatisticCard title="Admins" value={statistics.admins} description="Admin accounts" iconClass="bg-purple-soft text-purple" />
      </section>

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">User List</h2>
            <p className="mt-1 text-sm text-text-muted">{users.length} user{users.length !== 1 ? "s" : ""} shown</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[320px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft"><SearchIcon /></span>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or mobile..." className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleFilter)} className="h-11 min-w-[160px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
              <option value="ALL">All Roles</option>
              <option value="USER">Customer</option>
              <option value="VENDOR">Vendor</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF_ADMIN">Staff Admin</option>
              <option value="SUPPORT">Support</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="h-11 min-w-[160px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100">
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">{pageError}</p>
            <button type="button" onClick={() => void loadUsers()} className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white">Try Again</button>
          </div>
        )}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {["User", "Email", "Mobile", "Role", "Status", "Joined", "Actions"].map((heading) => (
                  <th key={heading} className={`px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted ${heading === "Actions" ? "text-right" : "text-left"}`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <LoadingRows />
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-16 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700"><UserIcon /></span>
                  <h3 className="mt-4 text-base font-extrabold text-text-main">No users found</h3>
                  <p className="mt-1 text-sm text-text-muted">Change the filters and try again.</p>
                  {(search || roleFilter !== "ALL" || statusFilter !== "ALL") && <button type="button" onClick={clearFilters} className="mt-4 rounded-control border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700">Clear Filters</button>}
                </td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border transition last:border-b-0 hover:bg-surface-soft">
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <strong className="block max-w-[260px] truncate text-sm font-extrabold text-text-main">{[user.firstName, user.lastName].filter(Boolean).join(" ") || "No name"}</strong>
                        <span className="mt-1 block text-xs text-text-muted">ID: {user.id}</span>
                        {user.vendor && <span className="mt-1 block text-xs font-bold text-primary-700">{user.vendor.businessName}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-sm text-text-secondary"><MailIcon />{user.email}</span></td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-sm text-text-secondary"><PhoneIcon />{user.mobile || "Not added"}</span></td>
                    <td className="px-5 py-4"><StatusBadge config={roleConfig[user.role] || roleConfig.USER} /></td>
                    <td className="px-5 py-4"><StatusBadge config={statusConfig[user.status] || statusConfig.ACTIVE} /></td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-sm text-text-secondary"><CalendarIcon />{formatDate(user.createdAt)}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button type="button" disabled={actionUserId === user.id} onClick={() => void updateStatus(user, user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")} className="rounded-control border border-border bg-surface px-3 py-2 text-xs font-bold text-text-secondary hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50">
                          {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" disabled={actionUserId === user.id} onClick={() => void updateStatus(user, user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED")} className="rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-xs font-bold text-warning hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50">
                          {user.status === "BLOCKED" ? "Unblock" : "Block"}
                        </button>
                        <button type="button" disabled={actionUserId === user.id} onClick={() => setDeleteTarget(user)} className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-bold text-danger hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border lg:hidden">
          {loading ? (
            <div className="space-y-4 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted" />)}</div>
          ) : users.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700"><UserIcon /></span>
              <h3 className="mt-4 text-base font-extrabold text-text-main">No users found</h3>
              <p className="mt-1 text-sm text-text-muted">Change the filters and try again.</p>
            </div>
          ) : (
            users.map((user) => (
              <article key={user.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-base font-extrabold text-text-main">{[user.firstName, user.lastName].filter(Boolean).join(" ") || "No name"}</strong>
                    <span className="mt-1 block text-xs text-text-muted">{user.email}</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge config={roleConfig[user.role] || roleConfig.USER} />
                      <StatusBadge config={statusConfig[user.status] || statusConfig.ACTIVE} />
                    </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={actionUserId === user.id} onClick={() => void updateStatus(user, user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")} className="rounded-control border border-border bg-surface px-3 py-2 text-xs font-bold text-text-secondary disabled:opacity-50">
                          {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" disabled={actionUserId === user.id} onClick={() => void updateStatus(user, user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED")} className="rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-xs font-bold text-warning disabled:opacity-50">
                          {user.status === "BLOCKED" ? "Unblock" : "Block"}
                        </button>
                        <button type="button" disabled={actionUserId === user.id} onClick={() => setDeleteTarget(user)} className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-bold text-danger disabled:opacity-50">
                          Delete
                        </button>
                      </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              if (actionUserId === null) setDeleteTarget(null);
            }}
            aria-label="Close delete confirmation"
          />
          <section className="relative z-10 w-full max-w-md rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard-dropdown">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
              <CloseIcon />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-text-main">Delete user?</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              Delete <strong className="text-text-main">{deleteTargetName}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={actionUserId !== null} onClick={() => setDeleteTarget(null)} className="h-11 rounded-control border border-border px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-60">Cancel</button>
              <button type="button" disabled={actionUserId !== null} onClick={() => { void deleteUser(deleteTarget).then(() => setDeleteTarget(null)); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-danger px-5 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {actionUserId !== null && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {actionUserId !== null ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

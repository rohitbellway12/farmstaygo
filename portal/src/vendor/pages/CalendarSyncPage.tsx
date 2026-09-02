import {
  useCallback,
  useEffect,
  useState,
} from "react";

import api from "../../shared/api/api";

/*
|--------------------------------------------------------------------------
| Types & Interfaces
|--------------------------------------------------------------------------
*/

interface PropertyCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

interface PropertyImage {
  id: string;
  image: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
}

interface VendorProperty {
  id: string;
  title: string;
  bookingType: "ENTIRE_PROPERTY" | "ROOM_WISE" | "BOTH";
  status: string;
  totalRooms: number | null;
  city: string | null;
  state: string | null;
  category: PropertyCategory;
  images: PropertyImage[];
}

interface PropertiesResponse {
  success: boolean;
  message: string;
  data: VendorProperty[];
  total: number;
}

interface CalendarImport {
  id: string;
  propertyId: string;
  name: string;
  url: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CalendarImportsResponse {
  success: boolean;
  message: string;
  data: {
    imports: CalendarImport[];
    exportUrl: string;
  };
}

type ToastType = "success" | "error" | "info";

interface ToastState {
  type: ToastType;
  message: string;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string } } })
      .response?.data?.message === "string"
  ) {
    return (error as {
      response: { data: { message: string } };
    }).response.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return "Never synced";
  }

  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

const PRESET_PLATFORMS = [
  { name: "Airbnb", placeholder: "https://www.airbnb.com/calendar/ical/..." },
  { name: "Booking.com", placeholder: "https://admin.booking.com/hotel/hoteladmin/ical.html?..." },
  { name: "VRBO / Stayz", placeholder: "https://www.vrbo.com/icalendar/..." },
  { name: "MakeMyTrip", placeholder: "https://..." },
];

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

export default function CalendarSyncPage() {
  const [properties, setProperties] = useState<VendorProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [imports, setImports] = useState<CalendarImport[]>([]);
  const [importsLoading, setImportsLoading] = useState(false);
  const [exportUrl, setExportUrl] = useState("");

  const [newImportName, setNewImportName] = useState("");
  const [newImportUrl, setNewImportUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<"airbnb" | "booking" | "google">("airbnb");

  /*
  |--------------------------------------------------------------------------
  | Toast Auto Dismiss
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /*
  |--------------------------------------------------------------------------
  | Load Vendor Properties
  |--------------------------------------------------------------------------
  */

  const loadProperties = useCallback(async () => {
    try {
      setPropertiesLoading(true);
      setError("");

      const response = await api.get<PropertiesResponse>("/vendor/properties");
      const propertyList = response.data.data || [];
      setProperties(propertyList);

      if (propertyList.length > 0) {
        setSelectedPropertyId((current) => {
          if (current && propertyList.some((p) => p.id === current)) {
            return current;
          }
          return propertyList[0].id;
        });
      } else {
        setSelectedPropertyId("");
      }
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load your properties.")
      );
    } finally {
      setPropertiesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  /*
  |--------------------------------------------------------------------------
  | Load Calendar Imports for Selected Property
  |--------------------------------------------------------------------------
  */

  const loadImports = useCallback(async () => {
    if (!selectedPropertyId) {
      setImports([]);
      setExportUrl("");
      return;
    }

    try {
      setImportsLoading(true);
      setError("");

      const response = await api.get<CalendarImportsResponse>(
        `/vendor/properties/${selectedPropertyId}/calendar-imports`
      );

      setImports(response.data.data.imports || []);
      setExportUrl(response.data.data.exportUrl || "");
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to load calendar sync data.")
      );
      setImports([]);
      setExportUrl("");
    } finally {
      setImportsLoading(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    void loadImports();
  }, [loadImports]);

  /*
  |--------------------------------------------------------------------------
  | Add External Calendar
  |--------------------------------------------------------------------------
  */

  const handleAddImport = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newImportName.trim() || !newImportUrl.trim()) {
      setToast({
        type: "error",
        message: "Please enter both the platform name and the iCal URL.",
      });
      return;
    }

    if (!/^https?:\/\//i.test(newImportUrl)) {
      setToast({
        type: "error",
        message: "URL must start with http:// or https://",
      });
      return;
    }

    try {
      setSubmitting(true);

      const res = await api.post<{
        success: boolean;
        message: string;
        data: CalendarImport;
      }>(
        `/vendor/properties/${selectedPropertyId}/calendar-imports`,
        {
          name: newImportName.trim(),
          url: newImportUrl.trim(),
        }
      );

      setToast({
        type: "success",
        message: res.data.message || "Calendar connected! Synchronizing dates...",
      });

      setNewImportName("");
      setNewImportUrl("");
      void loadImports();
    } catch (requestError) {
      setToast({
        type: "error",
        message: getApiErrorMessage(requestError, "Unable to connect calendar."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Toggle Active / Paused
  |--------------------------------------------------------------------------
  */

  const handleToggleActive = useCallback(
    async (imp: CalendarImport) => {
      try {
        await api.put(
          `/vendor/properties/${selectedPropertyId}/calendar-imports/${imp.id}`,
          {
            isActive: !imp.isActive,
          }
        );

        setImports((prev) =>
          prev.map((existing) =>
            existing.id === imp.id
              ? { ...existing, isActive: !existing.isActive }
              : existing
          )
        );

        setToast({
          type: "info",
          message: `${imp.name} sync is now ${imp.isActive ? "Paused" : "Active"}.`,
        });
      } catch (requestError) {
        setToast({
          type: "error",
          message: getApiErrorMessage(requestError, "Failed to update calendar status."),
        });
      }
    },
    [selectedPropertyId]
  );

  /*
  |--------------------------------------------------------------------------
  | Manual Sync Now
  |--------------------------------------------------------------------------
  */

  const handleSyncNow = useCallback(
    async (imp: CalendarImport) => {
      try {
        setSyncingId(imp.id);

        const response = await api.post<{
          success: boolean;
          message: string;
          data: { blockedDates: number };
        }>(
          `/vendor/properties/${selectedPropertyId}/calendar-imports/${imp.id}/sync`
        );

        setToast({
          type: response.data.success ? "success" : "error",
          message: response.data.message,
        });

        if (response.data.success) {
          void loadImports();
        }
      } catch (requestError) {
        setToast({
          type: "error",
          message: getApiErrorMessage(requestError, "Unable to sync calendar."),
        });
      } finally {
        setSyncingId(null);
      }
    },
    [selectedPropertyId, loadImports]
  );

  /*
  |--------------------------------------------------------------------------
  | Delete Calendar Import
  |--------------------------------------------------------------------------
  */

  const handleDeleteImport = useCallback(
    async (imp: CalendarImport) => {
      if (
        !window.confirm(
          `Are you sure you want to remove "${imp.name}"? All blocked dates synced from this calendar will be released.`
        )
      ) {
        return;
      }

      try {
        await api.delete(
          `/vendor/properties/${selectedPropertyId}/calendar-imports/${imp.id}`
        );

        setImports((prev) => prev.filter((existing) => existing.id !== imp.id));

        setToast({
          type: "success",
          message: `Removed "${imp.name}" calendar import.`,
        });
      } catch (requestError) {
        setToast({
          type: "error",
          message: getApiErrorMessage(requestError, "Unable to delete calendar."),
        });
      }
    },
    [selectedPropertyId]
  );

  /*
  |--------------------------------------------------------------------------
  | Copy Export URL
  |--------------------------------------------------------------------------
  */

  const handleCopyExportUrl = async () => {
    if (!exportUrl) return;
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      setToast({
        type: "success",
        message: "FarmStayGo iCal URL copied to clipboard!",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setToast({
        type: "error",
        message: "Failed to copy automatically. Please copy the text manually.",
      });
    }
  };

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-main">
              2-Way Calendar Synchronization
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live 15-Min Auto Sync
            </span>
          </div>
          <p className="mt-1.5 text-sm text-text-muted">
            Seamlessly synchronize bookings and blocked dates between FarmStayGo and Airbnb, Booking.com, VRBO, or Google Calendar.
          </p>
        </div>

        {/* Quick Refresh All */}
        {selectedPropertyId && (
          <button
            type="button"
            onClick={() => void loadImports()}
            disabled={importsLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-ink-50 text-sm font-bold text-text-main shadow-2xs transition-all disabled:opacity-50 cursor-pointer self-start md:self-auto"
          >
            <svg
              className={`w-4 h-4 text-text-muted ${importsLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{importsLoading ? "Syncing..." : "Refresh Calendars"}</span>
          </button>
        )}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm font-semibold text-red-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              void loadProperties();
              void loadImports();
            }}
            className="text-xs bg-red-200/60 hover:bg-red-200 px-3.5 py-1.5 rounded-lg text-red-900 font-bold transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-5 py-3.5 text-sm font-bold shadow-2xl transition-all duration-300 flex items-center gap-3 ${
            toast.type === "success"
              ? "border-emerald-300 bg-emerald-900 text-white"
              : toast.type === "error"
              ? "border-red-300 bg-red-900 text-white"
              : "border-blue-300 bg-slate-900 text-white"
          }`}
        >
          {toast.type === "success" && (
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === "error" && (
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Property Selector Bar */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
              Select Your Property
            </label>
            <p className="text-xs text-text-muted">
              Choose which property calendar you want to configure or synchronize.
            </p>
          </div>

          {propertiesLoading ? (
            <div className="h-11 w-full sm:w-80 bg-ink-100 rounded-xl animate-pulse" />
          ) : properties.length === 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-muted">No properties found</span>
              <a
                href="/vendor/properties/new"
                className="rounded-xl bg-brand-700 px-4 py-2 text-xs font-bold text-white hover:bg-brand-800"
              >
                + Add Property
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-96">
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full appearance-none rounded-xl border-2 border-border bg-surface px-4 py-2.5 pr-10 text-sm font-bold text-text-main outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100 transition-all cursor-pointer"
                >
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      🏡 {property.title} {property.city ? `(${property.city})` : ""}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-text-muted">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {selectedProperty && (
                <span className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-black bg-brand-50 text-brand-800 border border-brand-200">
                  {selectedProperty.status}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Way Synchronization Dashboard */}
      {selectedPropertyId && (
        <div className="space-y-8">
          
          {/* Two-Way Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* CARD 1: INBOUND (Import External Calendars) */}
            <div className="rounded-3xl border-2 border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 via-surface to-surface p-6 sm:p-7 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-100/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    📥
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-text-main">
                      1. Import External Calendar
                    </h2>
                    <span className="text-xs font-bold text-emerald-700">
                      Airbnb, Booking.com ➔ FarmStayGo
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-text-muted leading-relaxed mb-5">
                Paste your external platform’s iCal URL here. When someone books on Airbnb or Booking.com, FarmStayGo automatically blocks those dates here.
              </p>

              {/* Platform Preset Chips */}
              <div className="mb-4">
                <label className="block text-2xs font-extrabold uppercase tracking-wider text-text-muted mb-2">
                  Quick Select Platform
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PLATFORMS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setNewImportName(preset.name);
                        if (!newImportUrl) {
                          setNewImportUrl("");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newImportName === preset.name
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-surface text-text-main border-border hover:border-emerald-400 hover:bg-emerald-50/50"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Calendar Form */}
              <form onSubmit={handleAddImport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    Platform Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newImportName}
                    onChange={(e) => setNewImportName(e.target.value)}
                    placeholder="e.g. Airbnb Listing #1"
                    className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-main placeholder:text-text-muted/60 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                    disabled={submitting}
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-main mb-1.5">
                    iCal / .ics URL from External Platform <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={newImportUrl}
                      onChange={(e) => setNewImportUrl(e.target.value)}
                      placeholder="https://www.airbnb.com/calendar/ical/..."
                      className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono text-text-main placeholder:text-text-muted/60 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all"
                      disabled={submitting}
                      required
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                      🔗
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] px-5 py-3 text-sm font-black text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Connecting & Fetching Dates...</span>
                    </>
                  ) : (
                    <>
                      <span>+ Connect & Sync Calendar</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* CARD 2: OUTBOUND (Export FarmStayGo Calendar) */}
            <div className="rounded-3xl border-2 border-brand-200/80 bg-gradient-to-b from-brand-50/40 via-surface to-surface p-6 sm:p-7 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-brand-100/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-brand-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    📤
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-text-main">
                      2. Export FarmStayGo Calendar
                    </h2>
                    <span className="text-xs font-bold text-brand-800">
                      FarmStayGo ➔ Airbnb, Booking.com
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-text-muted leading-relaxed mb-5">
                Share this unique calendar feed link with other platforms. When a guest books on FarmStayGo, your Airbnb & Booking.com calendars will automatically block the same dates.
              </p>

              {/* Feed Link Box */}
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-bold text-text-main">
                  Your Live Property iCal Feed URL
                </label>
                
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={exportUrl || "Generating your property feed..."}
                    className="flex-1 rounded-xl border border-border bg-ink-50 px-3.5 py-2.5 text-xs font-mono text-text-main select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyExportUrl}
                    disabled={!exportUrl}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-brand-700 hover:bg-brand-800 text-white active:scale-95"
                    }`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step-by-step Help Tabs */}
              <div className="rounded-2xl border border-border/80 bg-surface/80 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs font-extrabold text-text-main flex items-center gap-1.5">
                    <span>💡 How to paste on other platforms:</span>
                  </span>

                  <div className="flex gap-1 bg-ink-50 p-0.5 rounded-lg">
                    {(["airbnb", "booking", "google"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveGuideTab(tab)}
                        className={`px-2.5 py-1 text-2xs font-black uppercase rounded-md transition-all cursor-pointer ${
                          activeGuideTab === tab
                            ? "bg-surface text-brand-800 shadow-2xs"
                            : "text-text-muted hover:text-text-main"
                        }`}
                      >
                        {tab === "airbnb" ? "Airbnb" : tab === "booking" ? "Booking" : "Google"}
                      </button>
                    ))}
                  </div>
                </div>

                {activeGuideTab === "airbnb" && (
                  <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Go to your <strong>Airbnb Host Dashboard</strong> ➔ <strong>Listings</strong>.</li>
                    <li>Click <strong>Pricing and availability</strong> ➔ <strong>Calendar sync</strong>.</li>
                    <li>Click <strong>Import calendar</strong> and paste this copied URL.</li>
                    <li>Name it <strong>FarmStayGo</strong> and save!</li>
                  </ol>
                )}

                {activeGuideTab === "booking" && (
                  <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Log into <strong>Booking.com Extranet</strong> ➔ <strong>Rates & Availability</strong>.</li>
                    <li>Click <strong>Sync calendars</strong> ➔ <strong>Add calendar connection</strong>.</li>
                    <li>Paste this URL and name it <strong>FarmStayGo</strong>.</li>
                  </ol>
                )}

                {activeGuideTab === "google" && (
                  <ol className="text-xs text-text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Open <strong>Google Calendar</strong> on desktop.</li>
                    <li>Next to "Other calendars", click <strong>+ ➔ From URL</strong>.</li>
                    <li>Paste this link to view all property bookings in Google Calendar.</li>
                  </ol>
                )}
              </div>

            </div>

          </div>

          {/* Connected Calendars Management Section */}
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div>
                <h2 className="text-lg font-black text-text-main flex items-center gap-2">
                  <span>Connected Calendars</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-ink-100 text-text-muted">
                    {imports.length}
                  </span>
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  FarmStayGo automatically pulls latest booked dates from these calendars every 15 minutes.
                </p>
              </div>

              {imports.length > 0 && (
                <span className="text-2xs font-bold text-text-muted bg-ink-50 px-3 py-1.5 rounded-lg border border-border/60 self-start sm:self-auto">
                  Automatic Sync Interval: Every 15 mins
                </span>
              )}
            </div>

            {/* Calendars List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-2xs font-black uppercase tracking-wider text-text-muted">
                    <th className="pb-3 pl-2">Platform / Name</th>
                    <th className="pb-3">Sync Status</th>
                    <th className="pb-3">Last Synced</th>
                    <th className="pb-3">External Feed URL</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/70">
                  {importsLoading && imports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-text-muted">
                        <div className="inline-flex items-center gap-2">
                          <svg className="w-5 h-5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Loading connected calendars…</span>
                        </div>
                      </td>
                    </tr>
                  ) : imports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-text-muted">
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="h-12 w-12 rounded-2xl bg-ink-50 text-2xl flex items-center justify-center mx-auto">
                            📅
                          </div>
                          <div>
                            <p className="font-bold text-text-main">No external calendars connected yet</p>
                            <p className="text-xs text-text-muted mt-1">
                              Paste your Airbnb or Booking.com iCal link in <strong>Card 1</strong> above to start automatic date blocking.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    imports.map((imp) => {
                      const isCurrentlySyncing = syncingId === imp.id;

                      return (
                        <tr key={imp.id} className="hover:bg-ink-50/40 transition-colors group">
                          {/* Platform Name */}
                          <td className="py-4 pl-2 align-middle">
                            <div className="font-black text-text-main flex items-center gap-2">
                              <span>{imp.name}</span>
                            </div>
                            {imp.lastError ? (
                              <div className="mt-1 text-2xs font-bold text-red-600 flex items-center gap-1">
                                <span>⚠️ Error: {imp.lastError.slice(0, 70)}{imp.lastError.length > 70 && "…"}</span>
                              </div>
                            ) : (
                              <div className="text-2xs text-emerald-700 font-semibold mt-0.5">
                                ✓ Connected & syncing
                              </div>
                            )}
                          </td>

                          {/* Status Toggle */}
                          <td className="py-4 align-middle">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(imp)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                                imp.isActive
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Click to pause or activate sync"
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${imp.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                              <span>{imp.isActive ? "Active" : "Paused"}</span>
                            </button>
                          </td>

                          {/* Last Sync */}
                          <td className="py-4 align-middle text-xs font-semibold text-text-muted">
                            {formatDate(imp.lastSyncAt)}
                          </td>

                          {/* Feed URL */}
                          <td className="py-4 align-middle max-w-xs">
                            <span className="font-mono text-xs text-text-muted bg-ink-50 px-2 py-1 rounded-lg block truncate">
                              {imp.url}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 align-middle text-right pr-2">
                            <div className="flex items-center justify-end gap-2">
                              {/* Sync Now Button */}
                              <button
                                type="button"
                                onClick={() => handleSyncNow(imp)}
                                disabled={submitting || isCurrentlySyncing || !imp.isActive}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-xs font-black text-brand-800 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                                title="Run manual sync now"
                              >
                                <svg
                                  className={`w-3.5 h-3.5 ${isCurrentlySyncing ? "animate-spin text-brand-700" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{isCurrentlySyncing ? "Syncing..." : "Sync Now"}</span>
                              </button>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteImport(imp)}
                                disabled={submitting || isCurrentlySyncing}
                                className="p-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                                title="Remove this calendar"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../../shared/api/api";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type PropertyStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "INACTIVE"
  | "SUSPENDED";

type PropertyBookingType =
  | "ENTIRE_PROPERTY"
  | "ROOM_WISE"
  | "BOTH";

type AmenityGroup =
  | "POPULAR"
  | "BASIC"
  | "OUTDOOR"
  | "INDOOR"
  | "SAFETY"
  | "KITCHEN"
  | "ENTERTAINMENT"
  | "ACCESSIBILITY";

interface PropertyCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface PropertyImage {
  id: string;
  propertyId: string;
  image: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Amenity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  group: AmenityGroup;
  isActive: boolean;
  sortOrder: number;
}

interface PropertyAmenity {
  propertyId: string;
  amenityId: string;
  createdAt: string;
  amenity: Amenity;
}

interface VendorUser {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  status: string;
  emailVerified: boolean;
  mobileVerified: boolean;
}

interface PropertyVendor {
  id: number;
  businessName: string;
  kycStatus: string;
  commissionRate: string | number | null;
  createdAt: string;

  user: VendorUser;
}

interface AdminProperty {
  id: string;
  vendorId: number;
  categoryId: string;

  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  bookingType: PropertyBookingType;
  status: PropertyStatus;

  maxGuests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  totalRooms: number | null;

  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  latitude: string | number | null;
  longitude: string | number | null;

  basePrice: string | number | null;
  weekendPrice: string | number | null;
  cleaningFee: string | number | null;
  securityDeposit: string | number | null;

  checkInTime: string | null;
  checkOutTime: string | null;
  minimumStay: number;
  instantBook: boolean;

  rejectionReason: string | null;
  isFeatured: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;

  category: PropertyCategory;
  vendor: PropertyVendor;
  images: PropertyImage[];
  amenities: PropertyAmenity[];
}

interface PropertyDetailResponse {
  success: boolean;
  message: string;
  data: AdminProperty;
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

type ActionType =
  | "approve"
  | "reject"
  | null;

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const bookingTypeLabels: Record<
  PropertyBookingType,
  string
> = {
  ENTIRE_PROPERTY: "Entire Property",
  ROOM_WISE: "Room-wise Booking",
  BOTH: "Entire Property and Room-wise",
};

const amenityGroupLabels: Record<
  AmenityGroup,
  string
> = {
  POPULAR: "Popular",
  BASIC: "Basic",
  OUTDOOR: "Outdoor",
  INDOOR: "Indoor",
  SAFETY: "Safety",
  KITCHEN: "Kitchen",
  ENTERTAINMENT: "Entertainment",
  ACCESSIBILITY: "Accessibility",
};

const statusConfig: Record<
  PropertyStatus,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "border-border bg-surface-muted text-text-secondary",
    dotClassName: "bg-text-soft",
  },

  PENDING_APPROVAL: {
    label: "Pending Approval",
    className:
      "border-warning/20 bg-warning-soft text-warning",
    dotClassName: "bg-warning",
  },

  APPROVED: {
    label: "Approved",
    className:
      "border-success/20 bg-success-soft text-success",
    dotClassName: "bg-success",
  },

  REJECTED: {
    label: "Rejected",
    className:
      "border-danger/20 bg-danger-soft text-danger",
    dotClassName: "bg-danger",
  },

  INACTIVE: {
    label: "Inactive",
    className:
      "border-border bg-surface-muted text-text-muted",
    dotClassName: "bg-text-soft",
  },

  SUSPENDED: {
    label: "Suspended",
    className:
      "border-purple/20 bg-purple-soft text-purple",
    dotClassName: "bg-purple",
  },
};

/*
|--------------------------------------------------------------------------
| Backend Asset URL
|--------------------------------------------------------------------------
*/

const backendBaseUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const getAssetUrl = (
  storedPath?: string | null
): string => {
  if (!storedPath) {
    return "";
  }

  if (
    storedPath.startsWith("http://") ||
    storedPath.startsWith("https://") ||
    storedPath.startsWith("blob:")
  ) {
    return storedPath;
  }

  return `${backendBaseUrl}${
    storedPath.startsWith("/") ? "" : "/"
  }${storedPath}`;
};

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const formatPrice = (
  value: string | number | null
): string => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not added";
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "Not added";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsedValue);
};

const formatDate = (
  value?: string | null
): string => {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

const formatTime = (
  value?: string | null
): string => {
  if (!value) {
    return "Not added";
  }

  const [hoursValue, minutesValue] =
    value.split(":");

  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return value;
  }

  const period =
    hours >= 12 ? "PM" : "AM";

  const displayHours =
    hours % 12 || 12;

  return `${displayHours}:${String(
    minutes
  ).padStart(2, "0")} ${period}`;
};

const getVendorName = (
  vendor: PropertyVendor
): string => {
  const userName = [
    vendor.user.firstName,
    vendor.user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    vendor.businessName ||
    userName ||
    "Vendor"
  );
};

const getFullAddress = (
  property: AdminProperty
): string => {
  return [
    property.addressLine1,
    property.addressLine2,
    property.landmark,
    property.locality,
    property.city,
    property.state,
    property.country,
    property.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
};

const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (
    axios.isAxiosError<ApiErrorResponse>(
      error
    )
  ) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
};

/*
|--------------------------------------------------------------------------
| Icons
|--------------------------------------------------------------------------
*/

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function PropertyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 8h8" />
      <path d="M8 11h8" />
      <path d="M10 8c4 0 4 7 0 7" />
      <path d="m10 15 5 4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <circle
        cx="8.5"
        cy="9"
        r="1.5"
      />

      <path d="m21 15-5-5L5 20" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m5 12 4 4L19 6" />
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

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8" />
      <path d="M5.5 15A7 7 0 0 0 17.8 17.8L20 16" />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| Shared UI Components
|--------------------------------------------------------------------------
*/

function StatusBadge({
  status,
}: {
  status: PropertyStatus;
}) {
  const config =
    statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.className}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${config.dotClassName}`}
      />

      {config.label}
    </span>
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
          {icon}
        </span>

        <div>
          <h2 className="text-base font-extrabold text-text-main">
            {title}
          </h2>

          {description && (
            <p className="mt-0.5 text-xs text-text-muted">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function DetailItem({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={
        fullWidth
          ? "sm:col-span-2"
          : ""
      }
    >
      <span className="block text-xs font-semibold text-text-muted">
        {label}
      </span>

      <div className="mt-1.5 text-sm font-bold leading-6 text-text-main">
        {value || "Not added"}
      </div>
    </div>
  );
}

function VerificationBadge({
  verified,
  label,
}: {
  verified: boolean;
  label: string;
}) {
  return (
    <span
      className={
        verified
          ? "inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-bold text-success"
          : "inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-text-muted"
      }
    >
      <span>
        {verified ? "✓" : "—"}
      </span>

      {label}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| Property Review Page
|--------------------------------------------------------------------------
*/

export default function PropertyApprovalReviewPage() {
  const navigate = useNavigate();

  const { id } =
    useParams<{ id: string }>();

  const propertyId =
    String(id || "").trim();

  const [property, setProperty] =
    useState<AdminProperty | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState("");

  const [
    approveModalOpen,
    setApproveModalOpen,
  ] = useState(false);

  const [
    rejectModalOpen,
    setRejectModalOpen,
  ] = useState(false);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    submittingAction,
    setSubmittingAction,
  ] = useState<ActionType>(null);

  const [toast, setToast] =
    useState<ToastState | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Fetch Property Details
  |--------------------------------------------------------------------------
  */

  const fetchProperty =
    useCallback(async (): Promise<AdminProperty> => {
      if (!propertyId) {
        throw new Error(
          "Property ID is missing"
        );
      }

      const response =
        await api.get<PropertyDetailResponse>(
          `/admin/property-approvals/${propertyId}`
        );

      return response.data.data;
    }, [propertyId]);

  const loadProperty =
    useCallback(async () => {
      try {
        setLoading(true);
        setPageError("");

        const propertyData =
          await fetchProperty();

        setProperty(propertyData);

        setSelectedImageId(
          (
            propertyData.images.find(
              (image) => image.isCover
            ) ||
            propertyData.images[0]
          )?.id || ""
        );
      } catch (error) {
        setPageError(
          getApiErrorMessage(
            error,
            "Unable to load property review details."
          )
        );
      } finally {
        setLoading(false);
      }
    }, [fetchProperty]);

  useEffect(() => {
    void loadProperty();
  }, [loadProperty]);

  /*
  |--------------------------------------------------------------------------
  | Toast Timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setToast(null);
      },
      3500
    );

    return () =>
      window.clearTimeout(timer);
  }, [toast]);

  /*
  |--------------------------------------------------------------------------
  | Escape Key
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const closeModal = (
      event: KeyboardEvent
    ) => {
      if (
        event.key !== "Escape" ||
        submittingAction
      ) {
        return;
      }

      setApproveModalOpen(false);
      setRejectModalOpen(false);
      setActionError("");
    };

    window.addEventListener(
      "keydown",
      closeModal
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeModal
      );
    };
  }, [submittingAction]);

  /*
  |--------------------------------------------------------------------------
  | Selected Property Image
  |--------------------------------------------------------------------------
  */

  const selectedImage =
    useMemo(() => {
      if (!property) {
        return null;
      }

      return (
        property.images.find(
          (image) =>
            image.id === selectedImageId
        ) ||
        property.images.find(
          (image) => image.isCover
        ) ||
        property.images[0] ||
        null
      );
    }, [
      property,
      selectedImageId,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Approve Property
  |--------------------------------------------------------------------------
  */

  const handleApprove =
    async () => {
      if (!property) {
        return;
      }

      try {
        setSubmittingAction("approve");
        setActionError("");

        await api.patch(
          `/admin/property-approvals/${property.id}/approve`
        );

        const refreshedProperty =
          await fetchProperty();

        setProperty(refreshedProperty);
        setApproveModalOpen(false);

        setToast({
          type: "success",
          message:
            "Property approved successfully.",
        });
      } catch (error) {
        setActionError(
          getApiErrorMessage(
            error,
            "Unable to approve property."
          )
        );
      } finally {
        setSubmittingAction(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Reject Property
  |--------------------------------------------------------------------------
  */

  const handleReject =
    async () => {
      if (!property) {
        return;
      }

      const cleanedReason =
        rejectionReason.trim();

      if (cleanedReason.length < 5) {
        setActionError(
          "Rejection reason must contain at least 5 characters."
        );

        return;
      }

      try {
        setSubmittingAction("reject");
        setActionError("");

        await api.patch(
          `/admin/property-approvals/${property.id}/reject`,
          {
            reason: cleanedReason,
          }
        );

        const refreshedProperty =
          await fetchProperty();

        setProperty(refreshedProperty);
        setRejectModalOpen(false);
        setRejectionReason("");

        setToast({
          type: "success",
          message:
            "Property rejected successfully.",
        });
      } catch (error) {
        setActionError(
          getApiErrorMessage(
            error,
            "Unable to reject property."
          )
        );
      } finally {
        setSubmittingAction(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Loading State
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-32 animate-pulse rounded-dashboard-card bg-surface-muted" />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="space-y-5">
            <div className="h-[430px] animate-pulse rounded-dashboard-card bg-surface-muted" />

            <div className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted" />

            <div className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted" />
          </div>

          <div className="space-y-5">
            <div className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted" />

            <div className="h-80 animate-pulse rounded-dashboard-card bg-surface-muted" />
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error State
  |--------------------------------------------------------------------------
  */

  if (pageError || !property) {
    return (
      <section className="rounded-dashboard-large border border-danger/20 bg-surface p-8 text-center shadow-dashboard-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-danger-soft text-danger">
          <CloseIcon />
        </span>

        <h1 className="mt-4 text-xl font-extrabold text-text-main">
          Property review unavailable
        </h1>

        <p className="mt-2 text-sm text-danger">
          {pageError ||
            "Property details were not found."}
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/property-approvals"
              )
            }
            className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted"
          >
            Back to Approvals
          </button>

          <button
            type="button"
            onClick={() =>
              void loadProperty()
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white"
          >
            <RefreshIcon />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const reviewIsPending =
    property.status ===
    "PENDING_APPROVAL";

  const fullAddress =
    getFullAddress(property);

  return (
    <div className="space-y-5">
      {/* Toast */}

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
            {toast.type === "success"
              ? "✓"
              : "!"}
          </span>

          <p className="text-sm font-semibold">
            {toast.message}
          </p>

          <button
            type="button"
            onClick={() =>
              setToast(null)
            }
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Page Header */}

      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/property-approvals"
                )
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-text-secondary transition hover:bg-surface-muted hover:text-primary-700"
              aria-label="Back to property approvals"
            >
              <BackIcon />
            </button>

            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <PropertyIcon />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary-700">
                  {property.category.name}
                </span>

                <StatusBadge
                  status={property.status}
                />
              </div>

              <h1 className="mt-2 text-2xl font-extrabold text-text-main">
                {property.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <LocationIcon />

                  {[
                    property.city,
                    property.state,
                    property.country,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    "Location not available"}
                </span>

                <span>
                  Submitted:{" "}
                  {formatDate(
                    property.submittedAt
                  )}
                </span>
              </div>
            </div>
          </div>

          {reviewIsPending && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setRejectionReason("");
                  setRejectModalOpen(true);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-danger/30 bg-danger-soft px-5 text-sm font-bold text-danger transition hover:bg-danger/10"
              >
                <CloseIcon />
                Reject Property
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setApproveModalOpen(true);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800"
              >
                <CheckIcon />
                Approve Property
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <div className="space-y-5">
          {/* Image Gallery */}

          <SectionCard
            title="Property Photos"
            description={`${property.images.length} uploaded images`}
            icon={<ImageIcon />}
          >
            {selectedImage ? (
              <>
                <div className="relative overflow-hidden rounded-dashboard-card border border-border bg-surface-soft">
                  <img
                    src={getAssetUrl(
                      selectedImage.image
                    )}
                    alt={
                      selectedImage.altText ||
                      property.title
                    }
                    className="h-[280px] w-full object-cover sm:h-[390px]"
                  />

                  {selectedImage.isCover && (
                    <span className="absolute left-4 top-4 rounded-full bg-primary-700 px-3 py-1.5 text-xs font-bold text-white shadow">
                      Cover Photo
                    </span>
                  )}
                </div>

                {property.images.length > 1 && (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {property.images.map(
                      (image) => (
                        <button
                          type="button"
                          key={image.id}
                          onClick={() =>
                            setSelectedImageId(
                              image.id
                            )
                          }
                          className={`relative overflow-hidden rounded-xl border-2 bg-surface-soft transition ${
                            selectedImage.id ===
                            image.id
                              ? "border-primary-600 ring-4 ring-primary-100"
                              : "border-border hover:border-primary-300"
                          }`}
                        >
                          <img
                            src={getAssetUrl(
                              image.image
                            )}
                            alt={
                              image.altText ||
                              property.title
                            }
                            className="h-20 w-full object-cover"
                          />

                          {image.isCover && (
                            <span className="absolute bottom-1 left-1 rounded bg-primary-700 px-1.5 py-0.5 text-[9px] font-bold text-white">
                              Cover
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-dashboard-card border border-dashed border-border-strong bg-surface-soft text-center">
                <div>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                    <ImageIcon />
                  </span>

                  <p className="mt-3 text-sm font-bold text-text-main">
                    No property photos available
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Description */}

          <SectionCard
            title="Property Description"
            description="Vendor-provided listing content"
            icon={<PropertyIcon />}
          >
            <div>
              <span className="text-xs font-semibold text-text-muted">
                Short Description
              </span>

              <p className="mt-2 text-sm font-semibold leading-6 text-text-main">
                {property.shortDescription ||
                  "No short description added."}
              </p>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <span className="text-xs font-semibold text-text-muted">
                Full Description
              </span>

              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-text-secondary">
                {property.description ||
                  "No full description added."}
              </p>
            </div>
          </SectionCard>

          {/* Basic Information */}

          <SectionCard
            title="Basic Information"
            description="Category, booking model and capacity"
            icon={<PropertyIcon />}
          >
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem
                label="Property Category"
                value={
                  property.category.name
                }
              />

              <DetailItem
                label="Booking Type"
                value={
                  bookingTypeLabels[
                    property.bookingType
                  ]
                }
              />

              <DetailItem
                label="Maximum Guests"
                value={
                  property.maxGuests ??
                  "Not added"
                }
              />

              <DetailItem
                label="Bedrooms"
                value={
                  property.bedrooms ??
                  "Not added"
                }
              />

              <DetailItem
                label="Bathrooms"
                value={
                  property.bathrooms ??
                  "Not added"
                }
              />

              <DetailItem
                label="Beds"
                value={
                  property.beds ??
                  "Not added"
                }
              />

              <DetailItem
                label="Total Rooms"
                value={
                  property.totalRooms ??
                  "Not added"
                }
              />

              <DetailItem
                label="Property Slug"
                value={
                  <code className="break-all rounded-md bg-surface-muted px-2 py-1 text-xs text-text-secondary">
                    {property.slug}
                  </code>
                }
              />
            </div>
          </SectionCard>

          {/* Location */}

          <SectionCard
            title="Property Location"
            description="Address and map coordinates"
            icon={<LocationIcon />}
          >
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem
                label="Complete Address"
                value={
                  fullAddress ||
                  "Address not added"
                }
                fullWidth
              />

              <DetailItem
                label="Address Line 1"
                value={
                  property.addressLine1 ||
                  "Not added"
                }
              />

              <DetailItem
                label="Address Line 2"
                value={
                  property.addressLine2 ||
                  "Not added"
                }
              />

              <DetailItem
                label="Landmark"
                value={
                  property.landmark ||
                  "Not added"
                }
              />

              <DetailItem
                label="Locality"
                value={
                  property.locality ||
                  "Not added"
                }
              />

              <DetailItem
                label="City"
                value={
                  property.city ||
                  "Not added"
                }
              />

              <DetailItem
                label="State"
                value={
                  property.state ||
                  "Not added"
                }
              />

              <DetailItem
                label="Country"
                value={property.country}
              />

              <DetailItem
                label="Postal Code"
                value={
                  property.postalCode ||
                  "Not added"
                }
              />

              <DetailItem
                label="Latitude"
                value={
                  property.latitude ??
                  "Not added"
                }
              />

              <DetailItem
                label="Longitude"
                value={
                  property.longitude ??
                  "Not added"
                }
              />
            </div>
          </SectionCard>

          {/* Pricing */}

          <SectionCard
            title="Pricing and Stay Rules"
            description="Rates, fees and guest stay settings"
            icon={<PriceIcon />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-dashboard-card bg-primary-50 p-4">
                <span className="text-xs font-semibold text-primary-700">
                  Base Price
                </span>

                <strong className="mt-2 block text-xl font-extrabold text-text-main">
                  {formatPrice(
                    property.basePrice
                  )}
                </strong>
              </div>

              <div className="rounded-dashboard-card bg-warning-soft p-4">
                <span className="text-xs font-semibold text-warning">
                  Weekend Price
                </span>

                <strong className="mt-2 block text-xl font-extrabold text-text-main">
                  {formatPrice(
                    property.weekendPrice
                  )}
                </strong>
              </div>

              <div className="rounded-dashboard-card bg-info-soft p-4">
                <span className="text-xs font-semibold text-info">
                  Cleaning Fee
                </span>

                <strong className="mt-2 block text-xl font-extrabold text-text-main">
                  {formatPrice(
                    property.cleaningFee
                  )}
                </strong>
              </div>

              <div className="rounded-dashboard-card bg-purple-soft p-4">
                <span className="text-xs font-semibold text-purple">
                  Security Deposit
                </span>

                <strong className="mt-2 block text-xl font-extrabold text-text-main">
                  {formatPrice(
                    property.securityDeposit
                  )}
                </strong>
              </div>
            </div>

            <div className="mt-5 grid gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-2">
              <DetailItem
                label="Check-in Time"
                value={formatTime(
                  property.checkInTime
                )}
              />

              <DetailItem
                label="Check-out Time"
                value={formatTime(
                  property.checkOutTime
                )}
              />

              <DetailItem
                label="Minimum Stay"
                value={`${property.minimumStay} ${
                  property.minimumStay === 1
                    ? "night"
                    : "nights"
                }`}
              />

              <DetailItem
                label="Instant Booking"
                value={
                  property.instantBook
                    ? "Enabled"
                    : "Disabled"
                }
              />
            </div>
          </SectionCard>

          {/* Amenities */}

          <SectionCard
            title="Selected Amenities"
            description={`${property.amenities.length} amenities selected`}
            icon={<CheckIcon />}
          >
            {property.amenities.length >
            0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {property.amenities.map(
                  ({ amenity }) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-3 rounded-dashboard-card border border-border bg-surface-soft p-3"
                    >
                      {amenity.image ? (
                        <img
                          src={getAssetUrl(
                            amenity.image
                          )}
                          alt={amenity.name}
                          className="h-10 w-10 shrink-0 rounded-lg border border-border bg-surface object-contain p-1.5"
                        />
                      ) : (
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
                          <CheckIcon />
                        </span>
                      )}

                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-extrabold text-text-main">
                          {amenity.name}
                        </strong>

                        <span className="mt-0.5 block text-xs text-text-muted">
                          {
                            amenityGroupLabels[
                              amenity.group
                            ]
                          }
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="rounded-control border border-warning/20 bg-warning-soft p-4 text-sm font-semibold text-warning">
                No amenities have been selected.
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Sidebar */}

        <aside className="space-y-5 xl:sticky xl:top-[86px]">
          {/* Review Status */}

          <SectionCard
            title="Review Status"
            description="Property approval information"
            icon={<CheckIcon />}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-text-muted">
                Current Status
              </span>

              <StatusBadge
                status={property.status}
              />
            </div>

            <div className="mt-5 space-y-4 border-t border-border pt-5">
              <DetailItem
                label="Submitted At"
                value={formatDate(
                  property.submittedAt
                )}
              />

              <DetailItem
                label="Approved At"
                value={formatDate(
                  property.approvedAt
                )}
              />

              <DetailItem
                label="Last Updated"
                value={formatDate(
                  property.updatedAt
                )}
              />
            </div>

            {property.status ===
              "REJECTED" &&
              property.rejectionReason && (
                <div className="mt-5 rounded-dashboard-card border border-danger/20 bg-danger-soft p-4">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-danger">
                    Rejection Reason
                  </span>

                  <p className="mt-2 text-sm font-semibold leading-6 text-danger">
                    {
                      property.rejectionReason
                    }
                  </p>
                </div>
              )}
          </SectionCard>

          {/* Vendor Details */}

          <SectionCard
            title="Vendor Details"
            description="Property owner information"
            icon={<UserIcon />}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-100 text-sm font-extrabold text-primary-700">
                {[
                  property.vendor.user
                    .firstName?.charAt(0),
                  property.vendor.user
                    .lastName?.charAt(0),
                ]
                  .filter(Boolean)
                  .join("")
                  .toUpperCase() || "V"}
              </span>

              <div className="min-w-0">
                <strong className="block truncate text-base font-extrabold text-text-main">
                  {getVendorName(
                    property.vendor
                  )}
                </strong>

                <span className="mt-1 block text-xs text-text-muted">
                  Vendor ID:{" "}
                  {property.vendor.id}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-4 border-t border-border pt-5">
              <DetailItem
                label="Contact Person"
                value={[
                  property.vendor.user
                    .firstName,
                  property.vendor.user
                    .lastName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />

              <DetailItem
                label="Email Address"
                value={
                  <span className="break-all">
                    {
                      property.vendor.user
                        .email
                    }
                  </span>
                }
              />

              <DetailItem
                label="Mobile Number"
                value={
                  property.vendor.user
                    .mobile || "Not added"
                }
              />

              <DetailItem
                label="KYC Status"
                value={
                  property.vendor
                    .kycStatus
                }
              />

              <DetailItem
                label="Commission Rate"
                value={
                  property.vendor
                    .commissionRate !==
                    null
                    ? `${property.vendor.commissionRate}%`
                    : "Not configured"
                }
              />

              <DetailItem
                label="Vendor Since"
                value={formatDate(
                  property.vendor
                    .createdAt
                )}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <VerificationBadge
                verified={
                  property.vendor.user
                    .emailVerified
                }
                label="Email Verified"
              />

              <VerificationBadge
                verified={
                  property.vendor.user
                    .mobileVerified
                }
                label="Mobile Verified"
              />
            </div>
          </SectionCard>

          {/* Submission Summary */}

          <SectionCard
            title="Submission Summary"
            description="Quick property overview"
            icon={<PropertyIcon />}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-dashboard-card bg-primary-50 p-4 text-center">
                <strong className="block text-xl font-extrabold text-primary-700">
                  {property.images.length}
                </strong>

                <span className="mt-1 block text-xs text-text-muted">
                  Photos
                </span>
              </div>

              <div className="rounded-dashboard-card bg-success-soft p-4 text-center">
                <strong className="block text-xl font-extrabold text-success">
                  {
                    property.amenities
                      .length
                  }
                </strong>

                <span className="mt-1 block text-xs text-text-muted">
                  Amenities
                </span>
              </div>

              <div className="rounded-dashboard-card bg-warning-soft p-4 text-center">
                <strong className="block text-xl font-extrabold text-warning">
                  {property.maxGuests ??
                    "—"}
                </strong>

                <span className="mt-1 block text-xs text-text-muted">
                  Guests
                </span>
              </div>

              <div className="rounded-dashboard-card bg-purple-soft p-4 text-center">
                <strong className="block text-xl font-extrabold text-purple">
                  {property.totalRooms ??
                    property.bedrooms ??
                    "—"}
                </strong>

                <span className="mt-1 block text-xs text-text-muted">
                  Rooms
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Sticky Actions */}

          {reviewIsPending && (
            <section className="rounded-dashboard-card border border-primary-200 bg-primary-50 p-5 shadow-dashboard-card">
              <h2 className="text-base font-extrabold text-primary-800">
                Complete Review
              </h2>

              <p className="mt-2 text-sm leading-6 text-primary-700">
                Verify all property information
                before approving or returning the
                listing to the vendor.
              </p>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setApproveModalOpen(
                      true
                    );
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800"
                >
                  <CheckIcon />
                  Approve Property
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setRejectionReason(
                      ""
                    );
                    setRejectModalOpen(
                      true
                    );
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-danger/30 bg-surface px-5 text-sm font-bold text-danger hover:bg-danger-soft"
                >
                  <CloseIcon />
                  Reject Property
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Approve Modal */}

      {approveModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              if (!submittingAction) {
                setApproveModalOpen(
                  false
                );
                setActionError("");
              }
            }}
            aria-label="Close approve confirmation"
          />

          <section className="relative z-10 w-full max-w-md rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard-dropdown">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
              <CheckIcon />
            </span>

            <h2 className="mt-4 text-xl font-extrabold text-text-main">
              Approve this property?
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              <strong className="text-text-main">
                {property.title}
              </strong>{" "}
              will be marked as approved and can
              be used as an active FarmStayGo
              property listing.
            </p>

            {actionError && (
              <div className="mt-4 rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  Boolean(
                    submittingAction
                  )
                }
                onClick={() => {
                  setApproveModalOpen(
                    false
                  );
                  setActionError("");
                }}
                className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  Boolean(
                    submittingAction
                  )
                }
                onClick={() =>
                  void handleApprove()
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingAction ===
                  "approve" && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}

                {submittingAction ===
                "approve"
                  ? "Approving..."
                  : "Approve Property"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Reject Modal */}

      {rejectModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              if (!submittingAction) {
                setRejectModalOpen(
                  false
                );
                setActionError("");
              }
            }}
            aria-label="Close reject confirmation"
          />

          <section className="relative z-10 w-full max-w-lg rounded-dashboard-large border border-border bg-surface shadow-dashboard-dropdown">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
                  <CloseIcon />
                </span>

                <div>
                  <h2 className="text-xl font-extrabold text-text-main">
                    Reject Property
                  </h2>

                  <p className="mt-1 text-sm text-text-muted">
                    Tell the vendor what needs
                    to be corrected.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  Boolean(
                    submittingAction
                  )
                }
                onClick={() => {
                  setRejectModalOpen(
                    false
                  );
                  setActionError("");
                }}
                className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted disabled:opacity-60"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="px-6 py-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Rejection Reason
                  <span className="text-danger">
                    {" "}
                    *
                  </span>
                </span>

                <textarea
                  value={rejectionReason}
                  onChange={(event) => {
                    setRejectionReason(
                      event.target.value
                    );
                    setActionError("");
                  }}
                  rows={5}
                  maxLength={1000}
                  placeholder="For example: Please upload clearer exterior photos and correct the property address."
                  className={`w-full resize-y rounded-control border bg-surface px-4 py-3 text-sm leading-6 text-text-main outline-none transition placeholder:text-text-soft focus:ring-4 ${
                    actionError
                      ? "border-danger focus:border-danger focus:ring-danger-soft"
                      : "border-border focus:border-primary-400 focus:ring-primary-100"
                  }`}
                />

                <div className="mt-2 flex items-start justify-between gap-4">
                  <span className="text-xs text-text-muted">
                    Minimum 5 characters.
                  </span>

                  <span className="text-xs text-text-soft">
                    {
                      rejectionReason.length
                    }
                    /1000
                  </span>
                </div>
              </label>

              {actionError && (
                <div className="mt-4 rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                  {actionError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border bg-surface-soft px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  Boolean(
                    submittingAction
                  )
                }
                onClick={() => {
                  setRejectModalOpen(
                    false
                  );
                  setActionError("");
                }}
                className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  Boolean(
                    submittingAction
                  )
                }
                onClick={() =>
                  void handleReject()
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-danger px-5 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingAction ===
                  "reject" && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}

                {submittingAction ===
                "reject"
                  ? "Rejecting..."
                  : "Reject Property"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
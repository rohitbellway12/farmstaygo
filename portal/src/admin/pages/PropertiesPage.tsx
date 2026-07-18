import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

type ManageablePropertyStatus =
  | "APPROVED"
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

type FeaturedFilter =
  | "ALL"
  | "FEATURED"
  | "NOT_FEATURED";

interface PropertyCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder?: number;
}

interface PropertyImage {
  id: string;
  image: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface VendorUser {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  status: string;
  role?: string;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  createdAt?: string;
}

interface PropertyVendor {
  id: number;
  businessName: string;
  kycStatus: string;
  commissionRate: string | number | null;
  createdAt?: string;
  updatedAt?: string;
  user: VendorUser;
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

interface AdminProperty {
  id: string;
  vendorId: number;
  categoryId: string;

  title: string;
  slug: string;
  shortDescription: string | null;
  description?: string | null;

  bookingType: PropertyBookingType;
  status: PropertyStatus;

  maxGuests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  totalRooms: number | null;

  addressLine1: string | null;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;

  basePrice: string | number | null;
  weekendPrice?: string | number | null;
  cleaningFee?: string | number | null;
  securityDeposit?: string | number | null;

  checkInTime?: string | null;
  checkOutTime?: string | null;
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

  amenities?: PropertyAmenity[];

  _count: {
    images: number;
    amenities: number;
  };
}

interface PropertyStatistics {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  inactive: number;
  suspended: number;
  featured: number;
}

interface PropertyListResponse {
  success: boolean;
  message: string;
  data: AdminProperty[];
  total: number;
  statistics: PropertyStatistics;
}

interface PropertyDetailResponse {
  success: boolean;
  message: string;
  data: AdminProperty;
}

interface PropertyActionResponse {
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

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const emptyStatistics: PropertyStatistics = {
  total: 0,
  draft: 0,
  pendingApproval: 0,
  approved: 0,
  rejected: 0,
  inactive: 0,
  suspended: 0,
  featured: 0,
};

const bookingTypeLabels: Record<
  PropertyBookingType,
  string
> = {
  ENTIRE_PROPERTY: "Entire Property",
  ROOM_WISE: "Room-wise Booking",
  BOTH: "Entire + Room-wise",
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
    badgeClass: string;
    dotClass: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    badgeClass:
      "border-border bg-surface-muted text-text-secondary",
    dotClass: "bg-text-soft",
  },

  PENDING_APPROVAL: {
    label: "Pending Approval",
    badgeClass:
      "border-warning/20 bg-warning-soft text-warning",
    dotClass: "bg-warning",
  },

  APPROVED: {
    label: "Approved",
    badgeClass:
      "border-success/20 bg-success-soft text-success",
    dotClass: "bg-success",
  },

  REJECTED: {
    label: "Rejected",
    badgeClass:
      "border-danger/20 bg-danger-soft text-danger",
    dotClass: "bg-danger",
  },

  INACTIVE: {
    label: "Inactive",
    badgeClass:
      "border-border bg-surface-muted text-text-muted",
    dotClass: "bg-text-soft",
  },

  SUSPENDED: {
    label: "Suspended",
    badgeClass:
      "border-purple/20 bg-purple-soft text-purple",
    dotClass: "bg-purple",
  },
};

const statusTransitions: Record<
  ManageablePropertyStatus,
  ManageablePropertyStatus[]
> = {
  APPROVED: ["INACTIVE", "SUSPENDED"],
  INACTIVE: ["APPROVED", "SUSPENDED"],
  SUSPENDED: ["APPROVED", "INACTIVE"],
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
  value: string | number | null | undefined
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
  }).format(parsedDate);
};

const formatDateTime = (
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
  const fullName = [
    vendor.user.firstName,
    vendor.user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    vendor.businessName ||
    fullName ||
    "Vendor"
  );
};

const getLocation = (
  property: AdminProperty
): string => {
  return [
    property.city,
    property.state,
    property.country,
  ]
    .filter(Boolean)
    .join(", ");
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

const isManageableStatus = (
  status: PropertyStatus
): status is ManageablePropertyStatus => {
  return [
    "APPROVED",
    "INACTIVE",
    "SUSPENDED",
  ].includes(status);
};

/*
|--------------------------------------------------------------------------
| Icons
|--------------------------------------------------------------------------
*/

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

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
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
      className="h-6 w-6"
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
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m21 15-5-5L5 20" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StarIcon({
  filled = false,
}: {
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill={
        filled
          ? "currentColor"
          : "none"
      }
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4" />
      <path d="M9 4.6A1.7 1.7 0 0 0 8 4l-.9-.1a2 2 0 1 0-2.8 2.8l.1.9A1.7 1.7 0 0 0 4.6 9" />
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

/*
|--------------------------------------------------------------------------
| Shared Components
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.badgeClass}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${config.dotClass}`}
      />

      {config.label}
    </span>
  );
}

function StatisticCard({
  title,
  value,
  description,
  iconClass,
}: {
  title: string;
  value: number;
  description: string;
  iconClass: string;
}) {
  return (
    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-text-muted">
            {title}
          </span>

          <strong className="mt-2 block text-3xl font-extrabold leading-none text-text-main">
            {value}
          </strong>

          <span className="mt-2 block text-xs text-text-muted">
            {description}
          </span>
        </div>

        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${iconClass}`}
        >
          <PropertyIcon />
        </span>
      </div>
    </section>
  );
}

function PropertyCover({
  property,
  className,
}: {
  property: AdminProperty;
  className: string;
}) {
  const imagePath =
    property.images[0]?.image ||
    property.category.image;

  if (imagePath) {
    return (
      <img
        src={getAssetUrl(imagePath)}
        alt={property.title}
        className={className}
      />
    );
  }

  return (
    <span
      className={`grid place-items-center bg-primary-50 text-primary-700 ${className}`}
    >
      <ImageIcon />
    </span>
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

      <div className="mt-1.5 break-words text-sm font-bold leading-6 text-text-main">
        {value || "Not added"}
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((item) => (
        <tr
          key={item}
          className="border-b border-border last:border-b-0"
        >
          <td className="px-5 py-4">
            <div className="h-16 w-20 animate-pulse rounded-xl bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="space-y-2">
              <div className="h-4 w-44 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-surface-muted" />
            </div>
          </td>

          <td className="px-5 py-4">
            <div className="space-y-2">
              <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-surface-muted" />
            </div>
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-7 w-28 animate-pulse rounded-full bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-9 w-28 animate-pulse rounded bg-surface-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Admin Properties Page
|--------------------------------------------------------------------------
*/

export default function PropertiesPage() {
  const [properties, setProperties] =
    useState<AdminProperty[]>([]);

  const [statistics, setStatistics] =
    useState<PropertyStatistics>(
      emptyStatistics
    );

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<PropertyStatus | "ALL">(
      "ALL"
    );

  const [categoryFilter, setCategoryFilter] =
    useState("ALL");

  const [featuredFilter, setFeaturedFilter] =
    useState<FeaturedFilter>("ALL");

  const [toast, setToast] =
    useState<ToastState | null>(null);

  const [
    detailsProperty,
    setDetailsProperty,
  ] = useState<AdminProperty | null>(
    null
  );

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    detailsError,
    setDetailsError,
  ] = useState("");

  const [
    selectedImageId,
    setSelectedImageId,
  ] = useState("");

  const [
    statusTarget,
    setStatusTarget,
  ] = useState<AdminProperty | null>(
    null
  );

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<
    ManageablePropertyStatus | ""
  >("");

  const [
    statusSubmitting,
    setStatusSubmitting,
  ] = useState(false);

  const [
    statusError,
    setStatusError,
  ] = useState("");

  const [
    featuredUpdatingId,
    setFeaturedUpdatingId,
  ] = useState<string | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Load Properties
  |--------------------------------------------------------------------------
  */

  const loadProperties =
    useCallback(
      async (
        showMainLoader = true
      ) => {
        try {
          if (showMainLoader) {
            setLoading(true);
          }

          setPageError("");

          const response =
            await api.get<PropertyListResponse>(
              "/admin/properties",
              {
                params: {
                  status: "ALL",
                },
              }
            );

          setProperties(
            response.data.data || []
          );

          setStatistics(
            response.data.statistics ||
              emptyStatistics
          );
        } catch (error) {
          setPageError(
            getApiErrorMessage(
              error,
              "Unable to load properties."
            )
          );
        } finally {
          if (showMainLoader) {
            setLoading(false);
          }
        }
      },
      []
    );

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

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
    const closeOnEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key !== "Escape") {
        return;
      }

      if (!statusSubmitting) {
        setStatusTarget(null);
        setSelectedStatus("");
        setStatusError("");
      }

      if (!detailsLoading) {
        setDetailsProperty(null);
        setDetailsError("");
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, [
    detailsLoading,
    statusSubmitting,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Categories
  |--------------------------------------------------------------------------
  */

  const categories = useMemo(() => {
    const categoryMap = new Map<
      string,
      PropertyCategory
    >();

    properties.forEach((property) => {
      categoryMap.set(
        property.category.id,
        property.category
      );
    });

    return Array.from(
      categoryMap.values()
    ).sort((first, second) =>
      first.name.localeCompare(
        second.name
      )
    );
  }, [properties]);

  /*
  |--------------------------------------------------------------------------
  | Filter Properties
  |--------------------------------------------------------------------------
  */

  const filteredProperties =
    useMemo(() => {
      const searchText = search
        .trim()
        .toLowerCase();

      return properties.filter(
        (property) => {
          const matchesStatus =
            statusFilter === "ALL" ||
            property.status ===
              statusFilter;

          const matchesCategory =
            categoryFilter === "ALL" ||
            property.category.id ===
              categoryFilter;

          const matchesFeatured =
            featuredFilter === "ALL" ||
            (featuredFilter ===
              "FEATURED" &&
              property.isFeatured) ||
            (featuredFilter ===
              "NOT_FEATURED" &&
              !property.isFeatured);

          const searchableValues = [
            property.title,
            property.slug,
            property.category.name,
            property.city,
            property.state,
            property.country,
            property.vendor.businessName,
            property.vendor.user.firstName,
            property.vendor.user.lastName,
            property.vendor.user.email,
            property.vendor.user.mobile,
          ];

          const matchesSearch =
            !searchText ||
            searchableValues.some(
              (value) =>
                typeof value ===
                  "string" &&
                value
                  .toLowerCase()
                  .includes(searchText)
            );

          return (
            matchesStatus &&
            matchesCategory &&
            matchesFeatured &&
            matchesSearch
          );
        }
      );
    }, [
      properties,
      search,
      statusFilter,
      categoryFilter,
      featuredFilter,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Open Property Details
  |--------------------------------------------------------------------------
  */

  const openPropertyDetails =
    async (
      propertyId: string
    ) => {
      try {
        setDetailsLoading(true);
        setDetailsError("");

        const response =
          await api.get<PropertyDetailResponse>(
            `/admin/properties/${propertyId}`
          );

        const propertyData =
          response.data.data;

        setDetailsProperty(
          propertyData
        );

        setSelectedImageId(
          (
            propertyData.images.find(
              (image) => image.isCover
            ) ||
            propertyData.images[0]
          )?.id || ""
        );
      } catch (error) {
        setDetailsError(
          getApiErrorMessage(
            error,
            "Unable to load property details."
          )
        );

        setDetailsProperty(null);
      } finally {
        setDetailsLoading(false);
      }
    };

  const closeDetails = () => {
    if (detailsLoading) {
      return;
    }

    setDetailsProperty(null);
    setDetailsError("");
    setSelectedImageId("");
  };

  /*
  |--------------------------------------------------------------------------
  | Selected Detail Image
  |--------------------------------------------------------------------------
  */

  const selectedDetailImage =
    useMemo(() => {
      if (!detailsProperty) {
        return null;
      }

      return (
        detailsProperty.images.find(
          (image) =>
            image.id === selectedImageId
        ) ||
        detailsProperty.images.find(
          (image) => image.isCover
        ) ||
        detailsProperty.images[0] ||
        null
      );
    }, [
      detailsProperty,
      selectedImageId,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Status Management
  |--------------------------------------------------------------------------
  */

  const openStatusModal = (
    property: AdminProperty
  ) => {
    if (
      !isManageableStatus(
        property.status
      )
    ) {
      setToast({
        type: "error",
        message:
          "This property must complete the approval workflow before its management status can be changed.",
      });

      return;
    }

    const availableStatuses =
      statusTransitions[
        property.status
      ];

    setStatusTarget(property);

    setSelectedStatus(
      availableStatuses[0] || ""
    );

    setStatusError("");
  };

  const handleStatusUpdate =
    async () => {
      if (
        !statusTarget ||
        !selectedStatus
      ) {
        return;
      }

      try {
        setStatusSubmitting(true);
        setStatusError("");

        const response =
          await api.patch<PropertyActionResponse>(
            `/admin/properties/${statusTarget.id}/status`,
            {
              status: selectedStatus,
            }
          );

        setToast({
          type: "success",
          message:
            response.data.message ||
            "Property status updated successfully.",
        });

        setStatusTarget(null);
        setSelectedStatus("");

        await loadProperties(false);

        if (
          detailsProperty?.id ===
          statusTarget.id
        ) {
          await openPropertyDetails(
            statusTarget.id
          );
        }
      } catch (error) {
        setStatusError(
          getApiErrorMessage(
            error,
            "Unable to update property status."
          )
        );
      } finally {
        setStatusSubmitting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Featured Management
  |--------------------------------------------------------------------------
  */

  const handleFeaturedUpdate =
    async (
      property: AdminProperty
    ) => {
      const nextFeaturedStatus =
        !property.isFeatured;

      if (
        nextFeaturedStatus &&
        property.status !== "APPROVED"
      ) {
        setToast({
          type: "error",
          message:
            "Only approved properties can be marked as featured.",
        });

        return;
      }

      try {
        setFeaturedUpdatingId(
          property.id
        );

        const response =
          await api.patch<PropertyActionResponse>(
            `/admin/properties/${property.id}/featured`,
            {
              isFeatured:
                nextFeaturedStatus,
            }
          );

        setProperties(
          (currentProperties) =>
            currentProperties.map(
              (currentProperty) =>
                currentProperty.id ===
                property.id
                  ? {
                      ...currentProperty,
                      isFeatured:
                        nextFeaturedStatus,
                    }
                  : currentProperty
            )
        );

        setStatistics(
          (currentStatistics) => ({
            ...currentStatistics,
            featured:
              currentStatistics.featured +
              (nextFeaturedStatus
                ? 1
                : -1),
          })
        );

        setDetailsProperty(
          (currentProperty) =>
            currentProperty?.id ===
            property.id
              ? {
                  ...currentProperty,
                  isFeatured:
                    nextFeaturedStatus,
                }
              : currentProperty
        );

        setToast({
          type: "success",
          message:
            response.data.message ||
            (nextFeaturedStatus
              ? "Property marked as featured."
              : "Property removed from featured properties."),
        });
      } catch (error) {
        setToast({
          type: "error",
          message:
            getApiErrorMessage(
              error,
              "Unable to update featured property status."
            ),
        });
      } finally {
        setFeaturedUpdatingId(null);
      }
    };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setFeaturedFilter("ALL");
  };

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

      {/* Header */}

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <PropertyIcon />
          </span>

          <div>
            <h1 className="text-2xl font-extrabold text-text-main">
              Properties
            </h1>

            <p className="mt-1 text-sm text-text-muted">
              Manage all vendor properties,
              visibility and featured listings.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadProperties()
          }
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className={
              loading
                ? "animate-spin"
                : ""
            }
          >
            <RefreshIcon />
          </span>

          Refresh Properties
        </button>
      </section>

      {/* Statistics */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          title="Total Properties"
          value={statistics.total}
          description="All vendor properties"
          iconClass="bg-info-soft text-info"
        />

        <StatisticCard
          title="Approved"
          value={statistics.approved}
          description="Active approved listings"
          iconClass="bg-success-soft text-success"
        />

        <StatisticCard
          title="Hidden Properties"
          value={
            statistics.inactive +
            statistics.suspended
          }
          description="Inactive and suspended"
          iconClass="bg-warning-soft text-warning"
        />

        <StatisticCard
          title="Featured"
          value={statistics.featured}
          description="Highlighted properties"
          iconClass="bg-purple-soft text-purple"
        />
      </section>

      {/* Filters and List */}

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5">
          <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-extrabold text-text-main">
                Property List
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                {filteredProperties.length} of{" "}
                {properties.length} properties shown
              </p>
            </div>

            {(search ||
              statusFilter !== "ALL" ||
              categoryFilter !== "ALL" ||
              featuredFilter !== "ALL") && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-bold text-primary-700 hover:text-primary-800"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_190px_180px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
                <SearchIcon />
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search property, vendor or location..."
                className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as
                    | PropertyStatus
                    | "ALL"
                )
              }
              className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="ALL">
                All Statuses
              </option>
              <option value="APPROVED">
                Approved
              </option>
              <option value="INACTIVE">
                Inactive
              </option>
              <option value="SUSPENDED">
                Suspended
              </option>
              <option value="PENDING_APPROVAL">
                Pending Approval
              </option>
              <option value="REJECTED">
                Rejected
              </option>
              <option value="DRAFT">
                Draft
              </option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="ALL">
                All Categories
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                )
              )}
            </select>

            <select
              value={featuredFilter}
              onChange={(event) =>
                setFeaturedFilter(
                  event.target
                    .value as FeaturedFilter
                )
              }
              className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="ALL">
                All Properties
              </option>
              <option value="FEATURED">
                Featured Only
              </option>
              <option value="NOT_FEATURED">
                Not Featured
              </option>
            </select>
          </div>
        </div>

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">
              {pageError}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadProperties()
              }
              className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Desktop Table */}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1220px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {[
                  "Property",
                  "Vendor",
                  "Location",
                  "Price",
                  "Status",
                  "Featured",
                  "Updated",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className={`px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted ${
                      heading === "Actions"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filteredProperties.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center"
                  >
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                      <PropertyIcon />
                    </span>

                    <h3 className="mt-4 text-base font-extrabold text-text-main">
                      No properties found
                    </h3>

                    <p className="mt-1 text-sm text-text-muted">
                      Change the selected filters
                      and try again.
                    </p>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 rounded-control border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProperties.map(
                  (property) => (
                    <tr
                      key={property.id}
                      className="border-b border-border transition last:border-b-0 hover:bg-surface-soft"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <PropertyCover
                            property={property}
                            className="h-16 w-20 shrink-0 rounded-xl border border-border object-cover"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <strong className="block max-w-[250px] truncate text-sm font-extrabold text-text-main">
                                {property.title}
                              </strong>

                              {property.isFeatured && (
                                <span className="text-warning">
                                  <StarIcon
                                    filled
                                  />
                                </span>
                              )}
                            </div>

                            <span className="mt-1 block text-xs font-bold text-primary-700">
                              {
                                property
                                  .category.name
                              }
                            </span>

                            <span className="mt-1 block text-xs text-text-muted">
                              {
                                bookingTypeLabels[
                                  property
                                    .bookingType
                                ]
                              }
                            </span>

                            <span className="mt-1 block text-[11px] text-text-soft">
                              {
                                property._count
                                  .images
                              }{" "}
                              photos ·{" "}
                              {
                                property._count
                                  .amenities
                              }{" "}
                              amenities
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <strong className="block max-w-[200px] truncate text-sm font-extrabold text-text-main">
                          {getVendorName(
                            property.vendor
                          )}
                        </strong>

                        <span className="mt-1 block max-w-[220px] truncate text-xs text-text-muted">
                          {
                            property.vendor
                              .user.email
                          }
                        </span>

                        <span className="mt-1 block text-xs font-semibold text-primary-700">
                          KYC:{" "}
                          {
                            property.vendor
                              .kycStatus
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="flex max-w-[220px] items-start gap-1.5 text-sm text-text-secondary">
                          <span className="mt-0.5 shrink-0 text-text-muted">
                            <LocationIcon />
                          </span>

                          <span>
                            {getLocation(
                              property
                            ) ||
                              "Not available"}
                          </span>
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <strong className="block text-sm font-extrabold text-text-main">
                          {formatPrice(
                            property.basePrice
                          )}
                        </strong>

                        <span className="mt-1 block text-xs text-text-muted">
                          Base price
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            property.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={
                            featuredUpdatingId ===
                              property.id ||
                            (!property.isFeatured &&
                              property.status !==
                                "APPROVED")
                          }
                          onClick={() =>
                            void handleFeaturedUpdate(
                              property
                            )
                          }
                          className={`inline-flex h-9 items-center justify-center gap-2 rounded-control border px-3 text-xs font-bold transition ${
                            property.isFeatured
                              ? "border-warning/30 bg-warning-soft text-warning hover:bg-warning/10"
                              : property.status ===
                                  "APPROVED"
                                ? "border-border bg-surface text-text-secondary hover:border-warning/30 hover:bg-warning-soft hover:text-warning"
                                : "cursor-not-allowed border-border bg-surface-muted text-text-soft opacity-60"
                          }`}
                        >
                          <span
                            className={
                              featuredUpdatingId ===
                              property.id
                                ? "animate-spin"
                                : ""
                            }
                          >
                            <StarIcon
                              filled={
                                property.isFeatured
                              }
                            />
                          </span>

                          {property.isFeatured
                            ? "Featured"
                            : "Feature"}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {formatDate(
                          property.updatedAt
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void openPropertyDetails(
                                property.id
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                            aria-label={`View ${property.title}`}
                          >
                            <EyeIcon />
                          </button>

                          <button
                            type="button"
                            disabled={
                              !isManageableStatus(
                                property.status
                              )
                            }
                            onClick={() =>
                              openStatusModal(
                                property
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`Manage ${property.title}`}
                          >
                            <SettingsIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}

        <div className="divide-y divide-border lg:hidden">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={item}
                    className="h-80 animate-pulse rounded-dashboard-card bg-surface-muted"
                  />
                )
              )}
            </div>
          ) : filteredProperties.length ===
            0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                <PropertyIcon />
              </span>

              <h3 className="mt-4 text-base font-extrabold text-text-main">
                No properties found
              </h3>
            </div>
          ) : (
            filteredProperties.map(
              (property) => (
                <article
                  key={property.id}
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <PropertyCover
                      property={property}
                      className="h-20 w-24 shrink-0 rounded-xl border border-border object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <strong className="block truncate text-base font-extrabold text-text-main">
                            {property.title}
                          </strong>

                          <span className="mt-1 block text-xs font-bold text-primary-700">
                            {
                              property
                                .category.name
                            }
                          </span>
                        </div>

                        {property.isFeatured && (
                          <span className="shrink-0 text-warning">
                            <StarIcon
                              filled
                            />
                          </span>
                        )}
                      </div>

                      <div className="mt-2">
                        <StatusBadge
                          status={
                            property.status
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-dashboard-card bg-surface-soft p-4 sm:grid-cols-2">
                    <DetailItem
                      label="Vendor"
                      value={getVendorName(
                        property.vendor
                      )}
                    />

                    <DetailItem
                      label="Base Price"
                      value={formatPrice(
                        property.basePrice
                      )}
                    />

                    <DetailItem
                      label="Location"
                      value={
                        getLocation(
                          property
                        ) ||
                        "Not available"
                      }
                    />

                    <DetailItem
                      label="Updated"
                      value={formatDate(
                        property.updatedAt
                      )}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={
                        featuredUpdatingId ===
                          property.id ||
                        (!property.isFeatured &&
                          property.status !==
                            "APPROVED")
                      }
                      onClick={() =>
                        void handleFeaturedUpdate(
                          property
                        )
                      }
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-control border px-4 text-sm font-bold ${
                        property.isFeatured
                          ? "border-warning/30 bg-warning-soft text-warning"
                          : "border-border bg-surface text-text-secondary disabled:opacity-40"
                      }`}
                    >
                      <StarIcon
                        filled={
                          property.isFeatured
                        }
                      />

                      {property.isFeatured
                        ? "Featured"
                        : "Feature"}
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void openPropertyDetails(
                            property.id
                          )
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-bold text-text-secondary"
                      >
                        <EyeIcon />
                        View
                      </button>

                      <button
                        type="button"
                        disabled={
                          !isManageableStatus(
                            property.status
                          )
                        }
                        onClick={() =>
                          openStatusModal(
                            property
                          )
                        }
                        className="grid h-10 w-10 place-items-center rounded-control bg-primary-700 text-white disabled:opacity-40"
                      >
                        <SettingsIcon />
                      </button>
                    </div>
                  </div>
                </article>
              )
            )
          )}
        </div>
      </section>

      {/* Property Details Modal */}

      {(detailsProperty ||
        detailsLoading ||
        detailsError) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeDetails}
            aria-label="Close property details"
          />

          <section className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard-dropdown">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-extrabold text-text-main">
                  Property Details
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Complete property and vendor
                  information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              {detailsLoading && (
                <div className="space-y-5">
                  <div className="h-80 animate-pulse rounded-dashboard-card bg-surface-muted" />

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted" />
                    <div className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted" />
                  </div>
                </div>
              )}

              {detailsError &&
                !detailsLoading && (
                  <div className="rounded-dashboard-card border border-danger/20 bg-danger-soft p-6 text-center">
                    <p className="font-bold text-danger">
                      {detailsError}
                    </p>
                  </div>
                )}

              {detailsProperty &&
                !detailsLoading && (
                  <div className="space-y-5">
                    {/* Heading */}

                    <div className="flex flex-col gap-4 rounded-dashboard-card border border-border bg-surface-soft p-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wide text-primary-700">
                            {
                              detailsProperty
                                .category.name
                            }
                          </span>

                          <StatusBadge
                            status={
                              detailsProperty.status
                            }
                          />

                          {detailsProperty.isFeatured && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1.5 text-xs font-bold text-warning">
                              <StarIcon
                                filled
                              />
                              Featured
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 text-2xl font-extrabold text-text-main">
                          {
                            detailsProperty.title
                          }
                        </h3>

                        <p className="mt-2 flex items-start gap-2 text-sm text-text-muted">
                          <LocationIcon />
                          {getLocation(
                            detailsProperty
                          ) ||
                            "Location not available"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={
                            featuredUpdatingId ===
                              detailsProperty.id ||
                            (!detailsProperty.isFeatured &&
                              detailsProperty.status !==
                                "APPROVED")
                          }
                          onClick={() =>
                            void handleFeaturedUpdate(
                              detailsProperty
                            )
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-warning/30 bg-warning-soft px-4 text-sm font-bold text-warning disabled:opacity-40"
                        >
                          <StarIcon
                            filled={
                              detailsProperty.isFeatured
                            }
                          />

                          {detailsProperty.isFeatured
                            ? "Remove Featured"
                            : "Mark Featured"}
                        </button>

                        <button
                          type="button"
                          disabled={
                            !isManageableStatus(
                              detailsProperty.status
                            )
                          }
                          onClick={() =>
                            openStatusModal(
                              detailsProperty
                            )
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary-700 px-4 text-sm font-bold text-white disabled:opacity-40"
                        >
                          <SettingsIcon />
                          Manage Status
                        </button>
                      </div>
                    </div>

                    {/* Images */}

                    <section className="rounded-dashboard-card border border-border bg-surface p-5">
                      <h3 className="text-base font-extrabold text-text-main">
                        Property Photos
                      </h3>

                      {selectedDetailImage ? (
                        <>
                          <img
                            src={getAssetUrl(
                              selectedDetailImage.image
                            )}
                            alt={
                              selectedDetailImage.altText ||
                              detailsProperty.title
                            }
                            className="mt-4 h-[280px] w-full rounded-dashboard-card border border-border object-cover sm:h-[420px]"
                          />

                          {detailsProperty.images
                            .length > 1 && (
                            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                              {detailsProperty.images.map(
                                (image) => (
                                  <button
                                    type="button"
                                    key={
                                      image.id
                                    }
                                    onClick={() =>
                                      setSelectedImageId(
                                        image.id
                                      )
                                    }
                                    className={`overflow-hidden rounded-xl border-2 ${
                                      selectedDetailImage.id ===
                                      image.id
                                        ? "border-primary-600 ring-4 ring-primary-100"
                                        : "border-border"
                                    }`}
                                  >
                                    <img
                                      src={getAssetUrl(
                                        image.image
                                      )}
                                      alt={
                                        image.altText ||
                                        detailsProperty.title
                                      }
                                      className="h-20 w-full object-cover"
                                    />
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="mt-4 grid h-60 place-items-center rounded-dashboard-card bg-surface-muted text-text-muted">
                          No photos available
                        </div>
                      )}
                    </section>

                    <div className="grid gap-5 xl:grid-cols-2">
                      {/* Basic Information */}

                      <section className="rounded-dashboard-card border border-border bg-surface p-5">
                        <h3 className="text-base font-extrabold text-text-main">
                          Basic Information
                        </h3>

                        <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                          <DetailItem
                            label="Category"
                            value={
                              detailsProperty
                                .category.name
                            }
                          />

                          <DetailItem
                            label="Booking Type"
                            value={
                              bookingTypeLabels[
                                detailsProperty
                                  .bookingType
                              ]
                            }
                          />

                          <DetailItem
                            label="Maximum Guests"
                            value={
                              detailsProperty.maxGuests ??
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Bedrooms"
                            value={
                              detailsProperty.bedrooms ??
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Bathrooms"
                            value={
                              detailsProperty.bathrooms ??
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Beds"
                            value={
                              detailsProperty.beds ??
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Total Rooms"
                            value={
                              detailsProperty.totalRooms ??
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Instant Booking"
                            value={
                              detailsProperty.instantBook
                                ? "Enabled"
                                : "Disabled"
                            }
                          />
                        </div>

                        <div className="mt-5 border-t border-border pt-5">
                          <DetailItem
                            label="Short Description"
                            value={
                              detailsProperty.shortDescription ||
                              "Not added"
                            }
                            fullWidth
                          />

                          <div className="mt-5">
                            <DetailItem
                              label="Full Description"
                              value={
                                <p className="whitespace-pre-line font-normal text-text-secondary">
                                  {detailsProperty.description ||
                                    "Not added"}
                                </p>
                              }
                              fullWidth
                            />
                          </div>
                        </div>
                      </section>

                      {/* Pricing */}

                      <section className="rounded-dashboard-card border border-border bg-surface p-5">
                        <h3 className="text-base font-extrabold text-text-main">
                          Pricing and Stay Rules
                        </h3>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-dashboard-card bg-primary-50 p-4">
                            <span className="text-xs font-semibold text-primary-700">
                              Base Price
                            </span>

                            <strong className="mt-2 block text-xl font-extrabold text-text-main">
                              {formatPrice(
                                detailsProperty.basePrice
                              )}
                            </strong>
                          </div>

                          <div className="rounded-dashboard-card bg-warning-soft p-4">
                            <span className="text-xs font-semibold text-warning">
                              Weekend Price
                            </span>

                            <strong className="mt-2 block text-xl font-extrabold text-text-main">
                              {formatPrice(
                                detailsProperty.weekendPrice
                              )}
                            </strong>
                          </div>

                          <div className="rounded-dashboard-card bg-info-soft p-4">
                            <span className="text-xs font-semibold text-info">
                              Cleaning Fee
                            </span>

                            <strong className="mt-2 block text-xl font-extrabold text-text-main">
                              {formatPrice(
                                detailsProperty.cleaningFee
                              )}
                            </strong>
                          </div>

                          <div className="rounded-dashboard-card bg-purple-soft p-4">
                            <span className="text-xs font-semibold text-purple">
                              Security Deposit
                            </span>

                            <strong className="mt-2 block text-xl font-extrabold text-text-main">
                              {formatPrice(
                                detailsProperty.securityDeposit
                              )}
                            </strong>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-x-5 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
                          <DetailItem
                            label="Check-in"
                            value={formatTime(
                              detailsProperty.checkInTime
                            )}
                          />

                          <DetailItem
                            label="Check-out"
                            value={formatTime(
                              detailsProperty.checkOutTime
                            )}
                          />

                          <DetailItem
                            label="Minimum Stay"
                            value={`${detailsProperty.minimumStay} ${
                              detailsProperty.minimumStay ===
                              1
                                ? "night"
                                : "nights"
                            }`}
                          />

                          <DetailItem
                            label="Approved At"
                            value={formatDateTime(
                              detailsProperty.approvedAt
                            )}
                          />
                        </div>
                      </section>

                      {/* Location */}

                      <section className="rounded-dashboard-card border border-border bg-surface p-5">
                        <h3 className="text-base font-extrabold text-text-main">
                          Property Location
                        </h3>

                        <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                          <DetailItem
                            label="Complete Address"
                            value={
                              getFullAddress(
                                detailsProperty
                              ) ||
                              "Not added"
                            }
                            fullWidth
                          />

                          <DetailItem
                            label="City"
                            value={
                              detailsProperty.city ||
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="State"
                            value={
                              detailsProperty.state ||
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Country"
                            value={
                              detailsProperty.country
                            }
                          />

                          <DetailItem
                            label="Postal Code"
                            value={
                              detailsProperty.postalCode ||
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Latitude"
                            value={
                              detailsProperty.latitude ??
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="Longitude"
                            value={
                              detailsProperty.longitude ??
                              "Not added"
                            }
                          />
                        </div>
                      </section>

                      {/* Vendor */}

                      <section className="rounded-dashboard-card border border-border bg-surface p-5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-100 text-primary-700">
                            <UserIcon />
                          </span>

                          <div>
                            <h3 className="text-base font-extrabold text-text-main">
                              Vendor Details
                            </h3>

                            <p className="mt-1 text-xs text-text-muted">
                              Property owner
                              information
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                          <DetailItem
                            label="Business Name"
                            value={getVendorName(
                              detailsProperty.vendor
                            )}
                          />

                          <DetailItem
                            label="Contact Person"
                            value={[
                              detailsProperty.vendor
                                .user.firstName,
                              detailsProperty.vendor
                                .user.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />

                          <DetailItem
                            label="Email"
                            value={
                              detailsProperty.vendor
                                .user.email
                            }
                          />

                          <DetailItem
                            label="Mobile"
                            value={
                              detailsProperty.vendor
                                .user.mobile ||
                              "Not added"
                            }
                          />

                          <DetailItem
                            label="KYC Status"
                            value={
                              detailsProperty.vendor
                                .kycStatus
                            }
                          />

                          <DetailItem
                            label="Commission Rate"
                            value={
                              detailsProperty.vendor
                                .commissionRate !==
                              null
                                ? `${detailsProperty.vendor.commissionRate}%`
                                : "Not configured"
                            }
                          />
                        </div>
                      </section>
                    </div>

                    {/* Amenities */}

                    <section className="rounded-dashboard-card border border-border bg-surface p-5">
                      <h3 className="text-base font-extrabold text-text-main">
                        Selected Amenities
                      </h3>

                      <p className="mt-1 text-sm text-text-muted">
                        {detailsProperty.amenities
                          ?.length || 0}{" "}
                        amenities selected
                      </p>

                      {detailsProperty.amenities &&
                      detailsProperty.amenities
                        .length > 0 ? (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {detailsProperty.amenities.map(
                            ({
                              amenity,
                            }) => (
                              <div
                                key={
                                  amenity.id
                                }
                                className="flex items-center gap-3 rounded-dashboard-card border border-border bg-surface-soft p-3"
                              >
                                {amenity.image ? (
                                  <img
                                    src={getAssetUrl(
                                      amenity.image
                                    )}
                                    alt={
                                      amenity.name
                                    }
                                    className="h-10 w-10 shrink-0 rounded-lg border border-border bg-surface object-contain p-1.5"
                                  />
                                ) : (
                                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
                                    <CheckIcon />
                                  </span>
                                )}

                                <div className="min-w-0">
                                  <strong className="block truncate text-sm font-extrabold text-text-main">
                                    {
                                      amenity.name
                                    }
                                  </strong>

                                  <span className="mt-0.5 block text-xs text-text-muted">
                                    {
                                      amenityGroupLabels[
                                        amenity
                                          .group
                                      ]
                                    }
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 rounded-control bg-surface-muted p-4 text-sm text-text-muted">
                          No amenities selected.
                        </p>
                      )}
                    </section>

                    {/* Rejection Reason */}

                    {detailsProperty.status ===
                      "REJECTED" &&
                      detailsProperty.rejectionReason && (
                        <section className="rounded-dashboard-card border border-danger/20 bg-danger-soft p-5">
                          <h3 className="text-sm font-extrabold uppercase tracking-wide text-danger">
                            Rejection Reason
                          </h3>

                          <p className="mt-2 text-sm font-semibold leading-6 text-danger">
                            {
                              detailsProperty.rejectionReason
                            }
                          </p>
                        </section>
                      )}
                  </div>
                )}
            </div>
          </section>
        </div>
      )}

      {/* Status Management Modal */}

      {statusTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              if (!statusSubmitting) {
                setStatusTarget(null);
                setSelectedStatus("");
                setStatusError("");
              }
            }}
            aria-label="Close status modal"
          />

          <section className="relative z-10 w-full max-w-md rounded-dashboard-large border border-border bg-surface shadow-dashboard-dropdown">
            <div className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-text-main">
                  Manage Property Status
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Update visibility for{" "}
                  <strong className="text-text-main">
                    {statusTarget.title}
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                disabled={statusSubmitting}
                onClick={() => {
                  setStatusTarget(null);
                  setSelectedStatus("");
                  setStatusError("");
                }}
                className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted disabled:opacity-60"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center justify-between rounded-control bg-surface-soft p-4">
                <span className="text-sm font-semibold text-text-muted">
                  Current Status
                </span>

                <StatusBadge
                  status={
                    statusTarget.status
                  }
                />
              </div>

              <div>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  New Status
                </span>

                <div className="space-y-3">
                  {isManageableStatus(
                    statusTarget.status
                  ) &&
                    statusTransitions[
                      statusTarget.status
                    ].map((status) => (
                      <label
                        key={status}
                        className={`flex cursor-pointer items-start gap-3 rounded-dashboard-card border p-4 transition ${
                          selectedStatus ===
                          status
                            ? "border-primary-400 bg-primary-50"
                            : "border-border bg-surface hover:bg-surface-soft"
                        }`}
                      >
                        <input
                          type="radio"
                          name="property-status"
                          value={status}
                          checked={
                            selectedStatus ===
                            status
                          }
                          onChange={() => {
                            setSelectedStatus(
                              status
                            );
                            setStatusError(
                              ""
                            );
                          }}
                          className="mt-1"
                        />

                        <div>
                          <strong className="text-sm font-extrabold text-text-main">
                            {
                              statusConfig[
                                status
                              ].label
                            }
                          </strong>

                          <p className="mt-1 text-xs leading-5 text-text-muted">
                            {status ===
                            "APPROVED"
                              ? "Reactivate and make this property available again."
                              : status ===
                                  "INACTIVE"
                                ? "Temporarily hide this property from active listings."
                                : "Block this property because of an administrative or policy issue."}
                          </p>
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              {statusError && (
                <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                  {statusError}
                </div>
              )}

              {selectedStatus !==
                "APPROVED" &&
                statusTarget.isFeatured && (
                  <div className="rounded-control border border-warning/20 bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
                    The property will also be
                    removed from featured
                    properties.
                  </div>
                )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border bg-surface-soft px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={statusSubmitting}
                onClick={() => {
                  setStatusTarget(null);
                  setSelectedStatus("");
                  setStatusError("");
                }}
                className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  statusSubmitting ||
                  !selectedStatus
                }
                onClick={() =>
                  void handleStatusUpdate()
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusSubmitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}

                {statusSubmitting
                  ? "Updating..."
                  : "Update Status"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
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

type ApprovalStatusFilter =
  | "ALL"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

type PropertyBookingType =
  | "ENTIRE_PROPERTY"
  | "ROOM_WISE"
  | "BOTH";

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

interface VendorUser {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  mobile: string | null;
  status: string;
}

interface PropertyVendor {
  id: number;
  businessName: string;
  kycStatus: string;
  user: VendorUser;
}

interface AdminApprovalProperty {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;

  bookingType: PropertyBookingType;
  status: PropertyStatus;

  maxGuests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  beds: number | null;
  totalRooms: number | null;

  addressLine1: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;

  basePrice: string | number | null;

  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;

  category: PropertyCategory;
  vendor: PropertyVendor;
  images: PropertyImage[];

  _count: {
    images: number;
    amenities: number;
  };
}

interface PropertyApprovalListResponse {
  success: boolean;
  message: string;
  data: AdminApprovalProperty[];
  total: number;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

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
| Configuration
|--------------------------------------------------------------------------
*/

const statusConfig: Record<
  ApprovalStatusFilter,
  {
    label: string;
    description: string;
    badgeClass: string;
    iconClass: string;
  }
> = {
  ALL: {
    label: "All Reviews",
    description: "All submitted property reviews",
    badgeClass:
      "border-border bg-surface-muted text-text-secondary",
    iconClass:
      "bg-info-soft text-info",
  },

  PENDING_APPROVAL: {
    label: "Pending Approval",
    description: "Waiting for admin review",
    badgeClass:
      "border-warning/20 bg-warning-soft text-warning",
    iconClass:
      "bg-warning-soft text-warning",
  },

  APPROVED: {
    label: "Approved",
    description: "Properties approved by admin",
    badgeClass:
      "border-success/20 bg-success-soft text-success",
    iconClass:
      "bg-success-soft text-success",
  },

  REJECTED: {
    label: "Rejected",
    description: "Properties returned to vendors",
    badgeClass:
      "border-danger/20 bg-danger-soft text-danger",
    iconClass:
      "bg-danger-soft text-danger",
  },
};

const bookingTypeLabels: Record<
  PropertyBookingType,
  string
> = {
  ENTIRE_PROPERTY: "Entire Property",
  ROOM_WISE: "Room-wise",
  BOTH: "Entire + Room-wise",
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
    return "Not set";
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
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

const getVendorName = (
  vendor: PropertyVendor
): string => {
  const userName = [
    vendor.user.firstName,
    vendor.user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return vendor.businessName || userName || "Vendor";
};

const getPropertyLocation = (
  property: AdminApprovalProperty
): string => {
  return [
    property.city,
    property.state,
    property.country,
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

function ApprovalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 21h18" />
      <path d="M5 21V9l7-5 7 5v12" />
      <path d="m9 14 2 2 4-4" />
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
      className="h-4 w-4"
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

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| Reusable Components
|--------------------------------------------------------------------------
*/

function StatusBadge({
  status,
}: {
  status: ApprovalStatusFilter;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.badgeClass}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "PENDING_APPROVAL"
            ? "bg-warning"
            : status === "APPROVED"
              ? "bg-success"
              : status === "REJECTED"
                ? "bg-danger"
                : "bg-text-soft"
        }`}
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
          <ApprovalIcon />
        </span>
      </div>
    </section>
  );
}

function PropertyCover({
  property,
}: {
  property: AdminApprovalProperty;
}) {
  const imagePath =
    property.images[0]?.image ||
    property.category.image;

  if (imagePath) {
    return (
      <img
        src={getAssetUrl(imagePath)}
        alt={property.title}
        className="h-16 w-20 shrink-0 rounded-xl border border-border bg-surface-soft object-cover"
      />
    );
  }

  return (
    <span className="grid h-16 w-20 shrink-0 place-items-center rounded-xl border border-border bg-primary-50 text-primary-700">
      <ImageIcon />
    </span>
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
            <div className="h-3 w-44 animate-pulse rounded bg-surface-muted" />
          </div>
        </td>

        <td className="px-5 py-4">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
        </td>

        <td className="px-5 py-4">
          <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
        </td>

        <td className="px-5 py-4">
          <div className="h-7 w-28 animate-pulse rounded-full bg-surface-muted" />
        </td>

        <td className="px-5 py-4">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-surface-muted" />
        </td>
      </tr>
    ))}
  </>
  );
}

/*
|--------------------------------------------------------------------------
| Property Approvals Page
|--------------------------------------------------------------------------
*/

export default function PropertyApprovalsPage() {
  const navigate = useNavigate();

  const [properties, setProperties] =
    useState<AdminApprovalProperty[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<ApprovalStatusFilter>(
    "PENDING_APPROVAL"
  );

  /*
  |--------------------------------------------------------------------------
  | Load Approval Properties
  |--------------------------------------------------------------------------
  */

  const loadProperties =
    useCallback(async () => {
      try {
        setLoading(true);
        setPageError("");

        const [
          pendingResponse,
          approvedResponse,
          rejectedResponse,
        ] = await Promise.all([
          api.get<PropertyApprovalListResponse>(
            "/admin/property-approvals",
            {
              params: {
                status:
                  "PENDING_APPROVAL",
              },
            }
          ),

          api.get<PropertyApprovalListResponse>(
            "/admin/property-approvals",
            {
              params: {
                status: "APPROVED",
              },
            }
          ),

          api.get<PropertyApprovalListResponse>(
            "/admin/property-approvals",
            {
              params: {
                status: "REJECTED",
              },
            }
          ),
        ]);

        const combinedProperties = [
          ...(pendingResponse.data.data || []),
          ...(approvedResponse.data.data || []),
          ...(rejectedResponse.data.data || []),
        ];

        combinedProperties.sort(
          (firstProperty, secondProperty) => {
            const firstDate = new Date(
              firstProperty.submittedAt ||
                firstProperty.updatedAt
            ).getTime();

            const secondDate = new Date(
              secondProperty.submittedAt ||
                secondProperty.updatedAt
            ).getTime();

            return secondDate - firstDate;
          }
        );

        setProperties(combinedProperties);
      } catch (error) {
        setPageError(
          getApiErrorMessage(
            error,
            "Unable to load property approvals."
          )
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  /*
  |--------------------------------------------------------------------------
  | Statistics
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    const pending = properties.filter(
      (property) =>
        property.status ===
        "PENDING_APPROVAL"
    ).length;

    const approved = properties.filter(
      (property) =>
        property.status === "APPROVED"
    ).length;

    const rejected = properties.filter(
      (property) =>
        property.status === "REJECTED"
    ).length;

    return {
      total:
        pending +
        approved +
        rejected,

      pending,
      approved,
      rejected,
    };
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

          const searchableValues = [
            property.title,
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
                typeof value === "string" &&
                value
                  .toLowerCase()
                  .includes(searchText)
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      properties,
      search,
      statusFilter,
    ]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter(
      "PENDING_APPROVAL"
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <ApprovalIcon />
          </span>

          <div>
            <h1 className="text-2xl font-extrabold text-text-main">
              Property Approvals
            </h1>

            <p className="mt-1 text-sm text-text-muted">
              Review vendor property submissions
              before publishing them on FarmStayGo.
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
              loading ? "animate-spin" : ""
            }
          >
            <RefreshIcon />
          </span>

          Refresh Reviews
        </button>
      </section>

      {/* Statistics */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          title="Total Reviews"
          value={statistics.total}
          description="Submitted approval records"
          iconClass="bg-info-soft text-info"
        />

        <StatisticCard
          title="Pending Approval"
          value={statistics.pending}
          description="Waiting for your review"
          iconClass="bg-warning-soft text-warning"
        />

        <StatisticCard
          title="Approved"
          value={statistics.approved}
          description="Accepted property listings"
          iconClass="bg-success-soft text-success"
        />

        <StatisticCard
          title="Rejected"
          value={statistics.rejected}
          description="Returned for correction"
          iconClass="bg-danger-soft text-danger"
        />
      </section>

      {/* Property Approval List */}

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Review Queue
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              {filteredProperties.length} of{" "}
              {properties.length} submissions shown
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[320px]">
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
                    .value as ApprovalStatusFilter
                )
              }
              className="h-11 min-w-[190px] rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="ALL">
                All Reviews
              </option>

              <option value="PENDING_APPROVAL">
                Pending Approval
              </option>

              <option value="APPROVED">
                Approved
              </option>

              <option value="REJECTED">
                Rejected
              </option>
            </select>
          </div>
        </div>

        {/* Error State */}

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
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {[
                  "Property",
                  "Vendor",
                  "Location",
                  "Price",
                  "Submitted",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    className={`px-5 py-3.5 text-xs font-extrabold uppercase tracking-wide text-text-muted ${
                      heading === "Action"
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
                    colSpan={7}
                    className="px-5 py-16 text-center"
                  >
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                      <ApprovalIcon />
                    </span>

                    <h3 className="mt-4 text-base font-extrabold text-text-main">
                      No property reviews found
                    </h3>

                    <p className="mt-1 text-sm text-text-muted">
                      No submissions match the
                      selected filters.
                    </p>

                    {(search ||
                      statusFilter !==
                        "PENDING_APPROVAL") && (
                      <button
                        type="button"
                        onClick={
                          clearFilters
                        }
                        className="mt-4 rounded-control border border-primary-300 bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700"
                      >
                        Clear Filters
                      </button>
                    )}
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
                          />

                          <div className="min-w-0">
                            <strong className="block max-w-[260px] truncate text-sm font-extrabold text-text-main">
                              {property.title}
                            </strong>

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

                            <div className="mt-1 flex gap-3 text-[11px] text-text-soft">
                              <span>
                                {
                                  property
                                    ._count
                                    .images
                                }{" "}
                                photos
                              </span>

                              <span>
                                {
                                  property
                                    ._count
                                    .amenities
                                }{" "}
                                amenities
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <strong className="block max-w-[210px] truncate text-sm font-extrabold text-text-main">
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
                            {getPropertyLocation(
                              property
                            ) ||
                              "Location not available"}
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
                        <span className="block max-w-[150px] text-sm text-text-secondary">
                          {formatDate(
                            property.submittedAt
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            property.status as ApprovalStatusFilter
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/admin/property-approvals/${property.id}`
                              )
                            }
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-primary-700 px-4 text-xs font-bold text-white transition hover:bg-primary-800"
                          >
                            {property.status ===
                            "PENDING_APPROVAL"
                              ? "Review"
                              : "View"}

                            <ArrowIcon />
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
                    className="h-72 animate-pulse rounded-dashboard-card bg-surface-muted"
                  />
                )
              )}
            </div>
          ) : filteredProperties.length ===
            0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                <ApprovalIcon />
              </span>

              <h3 className="mt-4 text-base font-extrabold text-text-main">
                No property reviews found
              </h3>

              <p className="mt-1 text-sm text-text-muted">
                Change the filters and try
                again.
              </p>
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
                    />

                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-base font-extrabold text-text-main">
                        {property.title}
                      </strong>

                      <span className="mt-1 block text-xs font-bold text-primary-700">
                        {
                          property.category
                            .name
                        }
                      </span>

                      <div className="mt-2">
                        <StatusBadge
                          status={
                            property.status as ApprovalStatusFilter
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-dashboard-card bg-surface-soft p-4 sm:grid-cols-2">
                    <div>
                      <span className="text-xs font-semibold text-text-muted">
                        Vendor
                      </span>

                      <strong className="mt-1 flex items-center gap-1.5 text-sm text-text-main">
                        <UserIcon />

                        {getVendorName(
                          property.vendor
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-text-muted">
                        Base Price
                      </span>

                      <strong className="mt-1 block text-sm text-text-main">
                        {formatPrice(
                          property.basePrice
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-text-muted">
                        Location
                      </span>

                      <strong className="mt-1 flex items-start gap-1.5 text-sm text-text-main">
                        <LocationIcon />

                        {getPropertyLocation(
                          property
                        ) ||
                          "Not available"}
                      </strong>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-text-muted">
                        Submitted
                      </span>

                      <strong className="mt-1 block text-sm text-text-main">
                        {formatDate(
                          property.submittedAt
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">
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

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/admin/property-approvals/${property.id}`
                        )
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-primary-700 px-4 text-sm font-bold text-white"
                    >
                      {property.status ===
                      "PENDING_APPROVAL"
                        ? "Review"
                        : "View"}

                      <ArrowIcon />
                    </button>
                  </div>
                </article>
              )
            )
          )}
        </div>
      </section>
    </div>
  );
}
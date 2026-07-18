import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";

import api from "../../shared/api/api";
import {
  getAuth,
} from "../../shared/utils/auth";

/*
|--------------------------------------------------------------------------
| Property Types
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

  createdAt: string;
  updatedAt: string;

  category: PropertyCategory;
  images: PropertyImage[];

  _count: {
    images: number;
    amenities: number;
  };
}

interface PropertyApiResponse {
  success: boolean;
  message: string;
  data: VendorProperty[];
  total: number;
}

/*
|--------------------------------------------------------------------------
| Asset URL
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
| Status Configuration
|--------------------------------------------------------------------------
*/

const statusConfig: Record<
  PropertyStatus,
  {
    label: string;
    className: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
  },

  PENDING_APPROVAL: {
    label: "Pending Approval",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  APPROVED: {
    label: "Approved",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  REJECTED: {
    label: "Rejected",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },

  INACTIVE: {
    label: "Inactive",
    className:
      "border-gray-200 bg-gray-100 text-gray-700",
  },

  SUSPENDED: {
    label: "Suspended",
    className:
      "border-purple-200 bg-purple-50 text-purple-700",
  },
};

const bookingTypeLabels: Record<
  PropertyBookingType,
  string
> = {
  ENTIRE_PROPERTY: "Entire Property",
  ROOM_WISE: "Room-wise Booking",
  BOTH: "Entire Property & Room-wise",
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
    return "Price not set";
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return "Price not set";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(parsedValue);
};

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

/*
|--------------------------------------------------------------------------
| Property Completion
|--------------------------------------------------------------------------
*/

const getPropertyCompletion = (
  property: VendorProperty
): number => {
  const completedSteps = [
    Boolean(
      property.title &&
        property.category &&
        property.bookingType &&
        property.maxGuests
    ),

    Boolean(
      property.addressLine1 &&
        property.city &&
        property.state &&
        property.postalCode
    ),

    property._count.images > 0,

    property.basePrice !== null,

    property._count.amenities > 0,

    property.status !== "DRAFT",
  ].filter(Boolean).length;

  return Math.round(
    (completedSteps / 6) * 100
  );
};

/*
|--------------------------------------------------------------------------
| API Error Message
|--------------------------------------------------------------------------
*/

const getErrorMessage = (
  error: unknown
): string => {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      error.response?.data?.message;

    if (typeof responseMessage === "string") {
      return responseMessage;
    }
  }

  return "Unable to load properties. Please try again.";
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
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
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

/*
|--------------------------------------------------------------------------
| Statistic Card
|--------------------------------------------------------------------------
*/

function StatisticCard({
  title,
  value,
  description,
  iconClassName,
}: {
  title: string;
  value: number;
  description: string;
  iconClassName: string;
}) {
  return (
    <div className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text-muted">
            {title}
          </p>

          <strong className="mt-2 block text-3xl font-extrabold tracking-tight text-text-main">
            {value}
          </strong>

          <p className="mt-2 text-sm text-text-soft">
            {description}
          </p>
        </div>

        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${iconClassName}`}
        >
          <PropertyIcon />
        </span>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Property Image
|--------------------------------------------------------------------------
*/

function PropertyCover({
  property,
}: {
  property: VendorProperty;
}) {
  const coverImage =
    property.images[0]?.image ||
    property.category?.image;

  if (coverImage) {
    return (
      <img
        src={getAssetUrl(coverImage)}
        alt={property.title}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="grid h-full w-full place-items-center bg-primary-50 text-primary-700">
      <ImageIcon />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Property Card
|--------------------------------------------------------------------------
*/

function PropertyCard({
  property,
}: {
  property: VendorProperty;
}) {
  const completion =
    getPropertyCompletion(property);

  const status =
    statusConfig[property.status];

  const location = [
    property.city,
    property.state,
  ]
    .filter(Boolean)
    .join(", ");

  const editAllowed = [
    "DRAFT",
    "REJECTED",
    "INACTIVE",
  ].includes(property.status);

  return (
    <article className="group overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard transition duration-200 hover:-translate-y-0.5 hover:shadow-dashboard-lg">
      <div className="relative h-52 overflow-hidden bg-surface-soft">
        <PropertyCover property={property} />

        <div className="absolute left-4 top-4">
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="absolute bottom-4 right-4">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-text-main shadow-sm backdrop-blur">
            {property._count.images} Photos
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
              {property.category.name}
            </p>

            <h2 className="mt-1 truncate text-xl font-extrabold text-text-main">
              {property.title}
            </h2>
          </div>

          <span className="shrink-0 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
            {bookingTypeLabels[
              property.bookingType
            ]}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-text-muted">
          {property.shortDescription ||
            "Property description has not been added yet."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3 text-sm text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <LocationIcon />

            {location || "Location not added"}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <UsersIcon />

            {property.maxGuests
              ? `${property.maxGuests} Guests`
              : "Guests not set"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-soft px-2 py-2.5">
            <strong className="block text-base font-extrabold text-text-main">
              {property.bedrooms ?? "—"}
            </strong>

            <span className="text-xs text-text-muted">
              Bedrooms
            </span>
          </div>

          <div className="rounded-lg bg-surface-soft px-2 py-2.5">
            <strong className="block text-base font-extrabold text-text-main">
              {property.bathrooms ?? "—"}
            </strong>

            <span className="text-xs text-text-muted">
              Bathrooms
            </span>
          </div>

          <div className="rounded-lg bg-surface-soft px-2 py-2.5">
            <strong className="block text-base font-extrabold text-text-main">
              {property._count.amenities}
            </strong>

            <span className="text-xs text-text-muted">
              Amenities
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-text-secondary">
              Listing completion
            </span>

            <span className="text-sm font-extrabold text-primary-700">
              {completion}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-50">
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{
                width: `${completion}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
  <div>
    <p className="text-xs font-semibold text-text-muted">
      Starting price
    </p>

    <strong className="mt-1 block text-lg font-extrabold text-text-main">
      {formatPrice(property.basePrice)}
    </strong>

    <p className="mt-1 text-xs text-text-soft">
      Updated {formatDate(property.updatedAt)}
    </p>
  </div>

  <div className="flex flex-wrap justify-end gap-2">
   <Link
    to={`/vendor/calendar?propertyId=${property.id}`}
    className="inline-flex h-10 shrink-0 items-center justify-center rounded-control border border-info/30 bg-info-soft px-4 text-sm font-bold text-info transition hover:bg-info/10"
  >
    Manage Calendar
  </Link>
   
    {(property.bookingType ===
      "ROOM_WISE" ||
      property.bookingType ===
        "BOTH") && (
      <Link
        to={`/vendor/properties/${property.id}/rooms`}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-control border border-primary-300 bg-primary-50 px-4 text-sm font-bold text-primary-700 transition hover:bg-primary-100"
      >
        Manage Rooms
      </Link>
    )}

    <Link
      to={`/vendor/properties/${property.id}/edit`}
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-control bg-primary-700 px-4 text-sm font-bold text-white transition hover:bg-primary-800"
    >
      {editAllowed
        ? "Continue Editing"
        : "View Property"}
    </Link>
  </div>
</div>
      </div>
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Properties Page
|--------------------------------------------------------------------------
*/

export default function PropertiesPage() {
  const auth = getAuth();
  const kycApproved =
    auth?.vendor?.kycStatus === "APPROVED";

  const [properties, setProperties] =
    useState<VendorProperty[]>([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<PropertyStatus | "ALL">("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Properties
  |--------------------------------------------------------------------------
  */

  const loadProperties =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get<PropertyApiResponse>(
            "/vendor/properties"
          );

        setProperties(response.data.data);
      } catch (requestError) {
        setError(
          getErrorMessage(requestError)
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
  | Property Statistics
  |--------------------------------------------------------------------------
  */

  const statistics = useMemo(() => {
    return {
      total: properties.length,

      draft: properties.filter(
        (property) =>
          property.status === "DRAFT"
      ).length,

      pending: properties.filter(
        (property) =>
          property.status ===
          "PENDING_APPROVAL"
      ).length,

      approved: properties.filter(
        (property) =>
          property.status === "APPROVED"
      ).length,
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
            property.status === statusFilter;

          const matchesSearch =
            !searchText ||
            property.title
              .toLowerCase()
              .includes(searchText) ||
            property.category.name
              .toLowerCase()
              .includes(searchText) ||
            property.city
              ?.toLowerCase()
              .includes(searchText) ||
            property.state
              ?.toLowerCase()
              .includes(searchText);

          return (
            matchesStatus &&
            Boolean(matchesSearch)
          );
        }
      );
    }, [
      properties,
      search,
      statusFilter,
    ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}

      <section className="flex flex-col gap-4 rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
            Property Management
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-main sm:text-3xl">
            My Properties
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Create, complete and manage all your
            FarmStayGo property listings.
          </p>
        </div>

        <Link
          to={
            kycApproved
              ? "/vendor/properties/new"
              : "/vendor/kyc-bank"
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800"
        >
          <PlusIcon />
          {kycApproved
            ? "Add Property"
            : "Complete KYC"}
        </Link>
      </section>

      {!kycApproved && (
        <section className="rounded-dashboard-card border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <h2 className="text-base font-extrabold">
            KYC approval required
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6">
            You can view this page, but property
            creation unlocks only after admin approves
            your KYC.
          </p>
          <Link
            to="/vendor/kyc-bank"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-control bg-amber-600 px-4 text-sm font-bold text-white"
          >
            Go to KYC
          </Link>
        </section>
      )}

      {/* Statistics */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          title="Total Properties"
          value={statistics.total}
          description="All property listings"
          iconClassName="bg-primary-50 text-primary-700"
        />

        <StatisticCard
          title="Draft Properties"
          value={statistics.draft}
          description="Listings being completed"
          iconClassName="bg-slate-100 text-slate-700"
        />

        <StatisticCard
          title="Pending Approval"
          value={statistics.pending}
          description="Waiting for admin review"
          iconClassName="bg-amber-50 text-amber-700"
        />

        <StatisticCard
          title="Approved"
          value={statistics.approved}
          description="Approved property listings"
          iconClassName="bg-emerald-50 text-emerald-700"
        />
      </section>

      {/* Search and Filters */}

      <section className="rounded-dashboard-card border border-border bg-surface p-4 shadow-dashboard">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by property, category or location..."
              className="h-11 w-full rounded-control border border-border bg-surface pl-12 pr-4 text-sm text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | PropertyStatus
                  | "ALL"
              )
            }
            className="h-11 min-w-52 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-main outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="DRAFT">
              Draft
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

            <option value="INACTIVE">
              Inactive
            </option>

            <option value="SUSPENDED">
              Suspended
            </option>
          </select>
        </div>
      </section>

      {/* Error State */}

      {error && (
        <section className="rounded-dashboard-card border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadProperties()
            }
            className="mt-3 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Try Again
          </button>
        </section>
      )}

      {/* Loading State */}

      {loading && !error && (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard"
            >
              <div className="h-52 animate-pulse bg-surface-soft" />

              <div className="space-y-4 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-surface-soft" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-surface-soft" />
                <div className="h-12 animate-pulse rounded bg-surface-soft" />
                <div className="h-10 animate-pulse rounded bg-surface-soft" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Property Grid */}

      {!loading &&
        !error &&
        filteredProperties.length > 0 && (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map(
              (property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                />
              )
            )}
          </section>
        )}

      {/* Empty Search Result */}

      {!loading &&
        !error &&
        properties.length > 0 &&
        filteredProperties.length === 0 && (
          <section className="rounded-dashboard-large border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
              <SearchIcon />
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-text-main">
              No matching properties found
            </h2>

            <p className="mt-2 text-sm text-text-muted">
              Change the search term or status
              filter and try again.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-5 rounded-control border border-primary-300 bg-primary-50 px-5 py-2.5 text-sm font-bold text-primary-700"
            >
              Clear Filters
            </button>
          </section>
        )}

      {/* First Property Empty State */}

      {!loading &&
        !error &&
        properties.length === 0 && (
          <section className="rounded-dashboard-large border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary-700">
              <PropertyIcon />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-text-main">
              Add your first property
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              Create your property listing, add
              photos, pricing, amenities and submit
              it for approval.
            </p>

            <Link
              to={
                kycApproved
                  ? "/vendor/properties/new"
                  : "/vendor/kyc-bank"
              }
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white"
            >
              <PlusIcon />
              {kycApproved
                ? "Create Property"
                : "Complete KYC"}
            </Link>
          </section>
        )}
    </div>
  );
}

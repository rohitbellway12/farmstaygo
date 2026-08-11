import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";

import api from "../../shared/api/api";
import { getAssetUrl } from "../../shared/config/assets";

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
| Status Configuration
|--------------------------------------------------------------------------
*/

const statusConfig: Record<
  PropertyStatus,
  {
    label: string;
    className: string;
    dotColor: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
    dotColor: "bg-slate-500",
  },

  PENDING_APPROVAL: {
    label: "Pending Approval",
    className:
      "border-amber-200 bg-amber-50 text-amber-800",
    dotColor: "bg-amber-500",
  },

  APPROVED: {
    label: "Approved",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
    dotColor: "bg-emerald-500",
  },

  REJECTED: {
    label: "Rejected",
    className:
      "border-red-200 bg-red-50 text-red-800",
    dotColor: "bg-red-500",
  },

  INACTIVE: {
    label: "Inactive",
    className:
      "border-gray-200 bg-gray-50 text-gray-700",
    dotColor: "bg-gray-500",
  },

  SUSPENDED: {
    label: "Suspended",
    className:
      "border-purple-200 bg-purple-50 text-purple-800",
    dotColor: "bg-purple-500",
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

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function RoomIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
      <path d="M21 10H3" />
      <path d="M8 10v5" />
      <path d="M12 10v5" />
      <path d="M16 10v5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
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
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/40">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {title}
          </p>

          <strong className="mt-2 block text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </strong>

          <p className="mt-1.5 text-sm text-slate-400">
            {description}
          </p>
        </div>

        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconClassName} shadow-sm`}
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
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600">
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
  onDelete,
}: {
  property: VendorProperty;
  onDelete?: (propertyId: string) => void;
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
    "PENDING_APPROVAL",
    "REJECTED",
    "INACTIVE",
  ].includes(property.status);

  const canDelete = [
    "DRAFT",
    "PENDING_APPROVAL",
    "INACTIVE",
  ].includes(property.status);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setDeleting(true);
      await onDelete(property.id);
      setShowDeleteModal(false);
    } catch (error) {
      // Error is handled by parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
      {/* Image Section */}

      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
        <PropertyCover property={property} />

        {/* Gradient Overlay */}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />

        {/* Status Badge */}

        <div className="absolute left-4 top-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${status.className} shadow-lg backdrop-blur-sm`}
          >
            <span
              className={`h-2 w-2 rounded-full ${status.dotColor}`}
            />
            {status.label}
          </span>
        </div>

        {/* Photo Count */}

        <div className="absolute bottom-4 right-4">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-lg backdrop-blur-sm">
            {property._count.images}{" "}
            Photos
          </span>
        </div>
      </div>

      {/* Content Section */}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
              {property.category.name}
            </p>

            <h2 className="mt-1.5 line-clamp-1 text-lg font-extrabold text-slate-900">
              {property.title}
            </h2>
          </div>

          <span className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
            {bookingTypeLabels[
              property.bookingType
            ]}
          </span>
        </div>

        <p className="mt-2.5 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-600">
          {property.shortDescription ||
            "Property description has not been added yet."}
        </p>

        {/* Location and Guests */}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-slate-100 py-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <LocationIcon />

            {location || "Location not added"}
          </span>

          <span className="inline-flex items-center gap-1.5 font-medium">
            <UsersIcon />

            {property.maxGuests
              ? `${property.maxGuests} Guests`
              : "Guests not set"}
          </span>
        </div>

        {/* Stats Grid */}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-3 text-center">
            <strong className="block text-base font-extrabold text-slate-900">
              {property.bedrooms ?? "—"}
            </strong>

            <span className="text-xs text-slate-500">
              Bedrooms
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-3 text-center">
            <strong className="block text-base font-extrabold text-slate-900">
              {property.bathrooms ?? "—"}
            </strong>

            <span className="text-xs text-slate-500">
              Bathrooms
            </span>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-3 text-center">
            <strong className="block text-base font-extrabold text-slate-900">
              {property._count.amenities}
            </strong>

            <span className="text-xs text-slate-500">
              Amenities
            </span>
          </div>
        </div>

        {/* Completion Bar */}

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-700">
              Listing completion
            </span>

            <span className="text-sm font-extrabold text-emerald-700">
              {completion}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{
                width: `${completion}%`,
              }}
            />
          </div>
        </div>

        {/* Actions */}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Starting price
            </p>

            <strong className="mt-1 block text-lg font-extrabold text-slate-900">
              {formatPrice(property.basePrice)}
            </strong>

            <p className="mt-1 text-xs text-slate-400">
              Updated {formatDate(property.updatedAt)}
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to={`/vendor/calendar?propertyId=${property.id}`}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <CalendarIcon />
              Calendar
            </Link>

            {(property.bookingType ===
              "ROOM_WISE" ||
              property.bookingType ===
                "BOTH") && (
              <Link
                to={`/vendor/properties/${property.id}/rooms`}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <RoomIcon />
                Rooms
              </Link>
            )}

            <Link
              to={`/vendor/properties/${property.id}/edit`}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-200/50 transition hover:bg-emerald-700"
            >
              <EditIcon />
              {editAllowed
                ? "Edit"
                : "View"}
            </Link>

            {canDelete && (
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(true)
                }
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
              >
                <TrashIcon />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}

      {showDeleteModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900">
              Delete Property
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete "
              {property.title}
              "? This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-red-600 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Deleting..."
                  : "Yes, Delete Property"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                className="h-10 w-full rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/*
|--------------------------------------------------------------------------
| Properties Page
|--------------------------------------------------------------------------
*/

export default function PropertiesPage() {
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
  | Delete Property
  |--------------------------------------------------------------------------
  */

  const handleDeleteProperty =
    useCallback(
      async (propertyId: string) => {
        try {
          await api.delete(
            `/vendor/properties/${propertyId}`
          );

          setProperties(
            (previous) =>
              previous.filter(
                (property) =>
                  property.id !==
                  propertyId
              )
          );
        } catch (requestError) {
          const message =
            getErrorMessage(
              requestError
            );

          setError(message);

          throw requestError;
        }
      },
      []
    );

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50/50 to-white">
      {/* Page Header */}

      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/60">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/40 via-white to-teal-50/30" />

        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">
              Property Management
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              My Properties
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Create, complete and manage all your
              FarmStayGo property listings.
            </p>
          </div>

          <Link
            to="/vendor/properties/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-md shadow-emerald-200/60 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
          >
            <PlusIcon />
            Add Property
          </Link>
        </div>
      </section>

      {/* Statistics */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          title="Total Properties"
          value={statistics.total}
          description="All property listings"
          iconClassName="bg-emerald-50 text-emerald-600"
        />

        <StatisticCard
          title="Draft Properties"
          value={statistics.draft}
          description="Listings being completed"
          iconClassName="bg-slate-100 text-slate-600"
        />

        <StatisticCard
          title="Pending Approval"
          value={statistics.pending}
          description="Waiting for admin review"
          iconClassName="bg-amber-50 text-amber-600"
        />

        <StatisticCard
          title="Approved"
          value={statistics.approved}
          description="Approved property listings"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
      </section>

      {/* Search and Filters */}

      <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search properties..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
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
            className="h-12 min-w-52 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-50"
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
        <section className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50/80 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-200 text-xs font-extrabold text-red-800">
              !
            </span>

            <div className="flex-1">
              <p className="font-bold text-red-800">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadProperties()
                }
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
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
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
            >
              <div className="h-56 animate-pulse bg-gradient-to-br from-slate-100 to-slate-50" />

              <div className="space-y-4 p-5">
                <div className="h-4 w-24 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-6 w-3/4 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
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
                  onDelete={handleDeleteProperty}
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
          <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white px-6 py-20 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
              <SearchIcon />
            </div>

            <h2 className="mt-6 text-2xl font-extrabold text-slate-900">
              No matching properties found
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              Change the search term or status
              filter and try again.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-6 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </section>
        )}

      {/* First Property Empty State */}

      {!loading &&
        !error &&
        properties.length === 0 && (
          <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 px-6 py-20 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
              <PropertyIcon />
            </div>

            <h2 className="mt-6 text-2xl font-extrabold text-slate-900">
              Add your first property
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
              Create your property listing, add
              photos, pricing, amenities and submit
              it for approval.
            </p>

            <Link
              to="/vendor/properties/new"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 text-sm font-bold text-white shadow-md shadow-emerald-200/60 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
            >
              <PlusIcon />
              Create Property
            </Link>
          </section>
        )}
    </div>
  );
}

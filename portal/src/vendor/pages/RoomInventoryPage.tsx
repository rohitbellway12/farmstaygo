import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useLocation,
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

type RoomStatusFilter =
  | "ALL"
  | "ACTIVE"
  | "INACTIVE";

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

interface PropertySummary {
  id: string;
  title: string;
  bookingType: PropertyBookingType;
  status: PropertyStatus;
  totalRooms: number | null;
  category: PropertyCategory;
  images: PropertyImage[];
}

interface Amenity {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  group: string;
}

interface RoomAmenity {
  roomTypeId: string;
  amenityId: string;
  amenity: Amenity;
}

interface RoomImage {
  id: string;
  roomTypeId: string;
  image: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  description: string | null;

  totalRooms: number;

  maxAdults: number;
  maxChildren: number;
  maxGuests: number;
  beds: number;
  bathrooms: number;

  basePrice: string | number;
  weekendPrice: string | number | null;

  isActive: boolean;
  sortOrder: number;

  createdAt: string;
  updatedAt: string;

  images: RoomImage[];
  amenities: RoomAmenity[];

  _count: {
    images: number;
    amenities: number;
  };
}

interface RoomStatistics {
  totalRoomTypes: number;
  activeRoomTypes: number;
  inactiveRoomTypes: number;
  totalInventory: number;
  activeInventory: number;
}

interface RoomListResponse {
  success: boolean;
  message: string;
  property: PropertySummary;
  data: RoomType[];
  total: number;
  statistics: RoomStatistics;
}

interface RoomActionResponse {
  success: boolean;
  message: string;
  data?: RoomType;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

interface RoomLocationState {
  roomMessage?: string;
  roomMessageType?: "success" | "error";
}

/*
|--------------------------------------------------------------------------
| Defaults
|--------------------------------------------------------------------------
*/

const emptyStatistics: RoomStatistics = {
  totalRoomTypes: 0,
  activeRoomTypes: 0,
  inactiveRoomTypes: 0,
  totalInventory: 0,
  activeInventory: 0,
};

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
| Formatting
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
  value: string
): string => {
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

const bookingTypeLabels: Record<
  PropertyBookingType,
  string
> = {
  ENTIRE_PROPERTY: "Entire Property",
  ROOM_WISE: "Room-wise Booking",
  BOTH: "Entire Property & Room-wise",
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

const roomManagementBlocked = (
  status?: PropertyStatus
): boolean => {
  return (
    status === "SUSPENDED"
  );
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

function RoomIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 19v-7" />
      <path d="M20 19v-7" />
      <path d="M4 15h16" />
      <path d="M6 12V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
      <path d="M7 12V9h4v3" />
      <path d="M13 12V9h4v3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
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

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 21H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
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

/*
|--------------------------------------------------------------------------
| Shared UI
|--------------------------------------------------------------------------
*/

function StatisticCard({
  label,
  value,
  description,
  className,
}: {
  label: string;
  value: number;
  description: string;
  className: string;
}) {
  return (
    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-text-muted">
            {label}
          </span>

          <strong className="mt-2 block text-3xl font-extrabold text-text-main">
            {value}
          </strong>

          <span className="mt-2 block text-xs text-text-soft">
            {description}
          </span>
        </div>

        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${className}`}
        >
          <RoomIcon />
        </span>
      </div>
    </section>
  );
}

function RoomCover({
  room,
}: {
  room: RoomType;
}) {
  const coverImage =
    room.images[0]?.image;

  if (coverImage) {
    return (
      <img
        src={getAssetUrl(coverImage)}
        alt={room.name}
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
| Page
|--------------------------------------------------------------------------
*/

export default function RoomInventoryPage() {
  const {
    propertyId: routePropertyId,
  } = useParams<{
    propertyId: string;
  }>();

  const propertyId = String(
    routePropertyId || ""
  ).trim();

  const navigate = useNavigate();
  const location = useLocation();

  const [property, setProperty] =
    useState<PropertySummary | null>(null);

  const [rooms, setRooms] =
    useState<RoomType[]>([]);

  const [statistics, setStatistics] =
    useState<RoomStatistics>(
      emptyStatistics
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<RoomStatusFilter>("ALL");

  const [
    actionRoomId,
    setActionRoomId,
  ] = useState<string | null>(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<RoomType | null>(null);

  const [
    deleteSubmitting,
    setDeleteSubmitting,
  ] = useState(false);

  const [toast, setToast] =
    useState<ToastState | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Form Page Message
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const state =
      location.state as
        | RoomLocationState
        | null;

    if (!state?.roomMessage) {
      return;
    }

    setToast({
      type:
        state.roomMessageType ||
        "success",

      message:
        state.roomMessage,
    });

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [
    location.pathname,
    location.state,
    navigate,
  ]);

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
      () => setToast(null),
      3500
    );

    return () =>
      window.clearTimeout(timer);
  }, [toast]);

  /*
  |--------------------------------------------------------------------------
  | Load Rooms
  |--------------------------------------------------------------------------
  */

  const loadRooms =
    useCallback(async () => {
      if (!propertyId) {
        setError(
          "Property ID is missing."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await api.get<RoomListResponse>(
            `/vendor/properties/${propertyId}/rooms`
          );

        setProperty(
          response.data.property
        );

        setRooms(
          response.data.data || []
        );

        setStatistics(
          response.data.statistics ||
            emptyStatistics
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load room inventory."
          )
        );
      } finally {
        setLoading(false);
      }
    }, [propertyId]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  /*
  |--------------------------------------------------------------------------
  | Filter Rooms
  |--------------------------------------------------------------------------
  */

  const filteredRooms =
    useMemo(() => {
      const searchText = search
        .trim()
        .toLowerCase();

      return rooms.filter((room) => {
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "ACTIVE" &&
            room.isActive) ||
          (statusFilter === "INACTIVE" &&
            !room.isActive);

        const searchableValues = [
          room.name,
          room.slug,
          room.description,
          ...room.amenities.map(
            ({ amenity }) =>
              amenity.name
          ),
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
      });
    }, [
      rooms,
      search,
      statusFilter,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Status Update
  |--------------------------------------------------------------------------
  */

  const updateRoomStatus =
    async (room: RoomType) => {
      if (
        roomManagementBlocked(
          property?.status
        )
      ) {
        setToast({
          type: "error",
          message:
            "Room inventory cannot currently be edited for this property.",
        });

        return;
      }

      try {
        setActionRoomId(room.id);

        const response =
          await api.patch<RoomActionResponse>(
            `/vendor/properties/${propertyId}/rooms/${room.id}/status`,
            {
              isActive:
                !room.isActive,
            }
          );

        setToast({
          type: "success",
          message:
            response.data.message,
        });

        await loadRooms();
      } catch (requestError) {
        setToast({
          type: "error",
          message:
            getApiErrorMessage(
              requestError,
              "Unable to update room status."
            ),
        });
      } finally {
        setActionRoomId(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete Room
  |--------------------------------------------------------------------------
  */

  const deleteRoom = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleteSubmitting(true);

      const response =
        await api.delete<RoomActionResponse>(
          `/vendor/properties/${propertyId}/rooms/${deleteTarget.id}`
        );

      setDeleteTarget(null);

      setToast({
        type: "success",
        message:
          response.data.message,
      });

      await loadRooms();
    } catch (requestError) {
      setToast({
        type: "error",
        message:
          getApiErrorMessage(
            requestError,
            "Unable to delete room type."
          ),
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const editingBlocked =
    roomManagementBlocked(
      property?.status
    );

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
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${
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
            className="ml-auto opacity-70"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Header */}

      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/vendor/properties"
                )
              }
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-text-secondary hover:bg-surface-soft"
            >
              <BackIcon />
            </button>

            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <RoomIcon />
            </span>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-primary-700">
                Room Inventory
              </p>

              <h1 className="mt-1 text-2xl font-extrabold text-text-main">
                {property?.title ||
                  "Manage Rooms"}
              </h1>

              <p className="mt-1 text-sm text-text-muted">
                {property
                  ? `${property.category.name} · ${
                      bookingTypeLabels[
                        property.bookingType
                      ]
                    }`
                  : "Manage room types and inventory."}
              </p>
            </div>
          </div>

          <Link
            to={`/vendor/properties/${propertyId}/rooms/new`}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-sm font-bold text-white ${
              editingBlocked
                ? "pointer-events-none bg-primary-300 opacity-60"
                : "bg-primary-700 hover:bg-primary-800"
            }`}
          >
            <PlusIcon />
            Add Room Type
          </Link>
        </div>
      </section>

      {/* Edit Blocked Warning */}

      {editingBlocked && (
        <section className="rounded-dashboard-card border border-warning/20 bg-warning-soft p-4 text-sm font-semibold text-warning">
          Room inventory editing is blocked because this property is suspended.
        </section>
      )}

      {/* Statistics */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatisticCard
          label="Room Types"
          value={
            statistics.totalRoomTypes
          }
          description="All configured room categories"
          className="bg-info-soft text-info"
        />

        <StatisticCard
          label="Active Types"
          value={
            statistics.activeRoomTypes
          }
          description="Available room categories"
          className="bg-success-soft text-success"
        />

        <StatisticCard
          label="Active Inventory"
          value={
            statistics.activeInventory
          }
          description="Total active room quantity"
          className="bg-primary-50 text-primary-700"
        />

        <StatisticCard
          label="Inactive Types"
          value={
            statistics.inactiveRoomTypes
          }
          description="Temporarily hidden room types"
          className="bg-warning-soft text-warning"
        />
      </section>

      {/* Filters */}

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
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search room type or amenity..."
              className="h-11 w-full rounded-control border border-border bg-surface pl-12 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as RoomStatusFilter
              )
            }
            className="h-11 min-w-52 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-main outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            <option value="ALL">
              All Room Types
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>
        </div>
      </section>

      {/* Error */}

      {error && (
        <section className="rounded-dashboard-card border border-danger/20 bg-danger-soft p-5">
          <p className="font-bold text-danger">
            {error}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void loadRooms()
              }
              className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/vendor/properties"
                )
              }
              className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary"
            >
              Back to Properties
            </button>
          </div>
        </section>
      )}

      {/* Loading */}

      {loading && !error && (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard"
            >
              <div className="h-48 animate-pulse bg-surface-soft" />

              <div className="space-y-4 p-5">
                <div className="h-5 w-1/2 animate-pulse rounded bg-surface-soft" />
                <div className="h-12 animate-pulse rounded bg-surface-soft" />
                <div className="h-20 animate-pulse rounded bg-surface-soft" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Room Cards */}

      {!loading &&
        !error &&
        filteredRooms.length > 0 && (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map(
              (room) => (
                <article
                  key={room.id}
                  className="group overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard transition hover:-translate-y-0.5 hover:shadow-dashboard-lg"
                >
                  <div className="relative h-48 overflow-hidden bg-surface-soft">
                    <RoomCover
                      room={room}
                    />

                    <span
                      className={`absolute left-4 top-4 rounded-full border px-3 py-1.5 text-xs font-bold ${
                        room.isActive
                          ? "border-success/20 bg-success-soft text-success"
                          : "border-border bg-surface-muted text-text-muted"
                      }`}
                    >
                      {room.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>

                    <span className="absolute bottom-4 right-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-text-main shadow-sm">
                      {
                        room._count
                          .images
                      }{" "}
                      Photos
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-extrabold text-text-main">
                          {room.name}
                        </h2>

                        <p className="mt-1 text-xs font-semibold text-text-muted">
                          Updated{" "}
                          {formatDate(
                            room.updatedAt
                          )}
                        </p>
                      </div>

                      <strong className="shrink-0 text-lg font-extrabold text-primary-700">
                        {formatPrice(
                          room.basePrice
                        )}
                      </strong>
                    </div>

                    <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-text-muted">
                      {room.description ||
                        "Room description has not been added."}
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-surface-soft p-2.5">
                        <strong className="block text-base font-extrabold text-text-main">
                          {
                            room.totalRooms
                          }
                        </strong>

                        <span className="text-xs text-text-muted">
                          Rooms
                        </span>
                      </div>

                      <div className="rounded-lg bg-surface-soft p-2.5">
                        <strong className="block text-base font-extrabold text-text-main">
                          {
                            room.maxGuests
                          }
                        </strong>

                        <span className="text-xs text-text-muted">
                          Guests
                        </span>
                      </div>

                      <div className="rounded-lg bg-surface-soft p-2.5">
                        <strong className="block text-base font-extrabold text-text-main">
                          {room.beds}
                        </strong>

                        <span className="text-xs text-text-muted">
                          Beds
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3">
                      <div>
                        <span className="block text-xs text-text-muted">
                          Weekend Price
                        </span>

                        <strong className="mt-1 block text-sm text-text-main">
                          {formatPrice(
                            room.weekendPrice
                          )}
                        </strong>
                      </div>

                      <div>
                        <span className="block text-xs text-text-muted">
                          Amenities
                        </span>

                        <strong className="mt-1 block text-sm text-text-main">
                          {
                            room._count
                              .amenities
                          }{" "}
                          selected
                        </strong>
                      </div>
                    </div>

                    {room.amenities.length >
                      0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {room.amenities
                          .slice(0, 4)
                          .map(
                            ({
                              amenity,
                            }) => (
                              <span
                                key={
                                  amenity.id
                                }
                                className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700"
                              >
                                {
                                  amenity.name
                                }
                              </span>
                            )
                          )}

                        {room.amenities
                          .length > 4 && (
                          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text-muted">
                            +
                            {room
                              .amenities
                              .length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={
                          editingBlocked ||
                          actionRoomId ===
                            room.id
                        }
                        onClick={() =>
                          void updateRoomStatus(
                            room
                          )
                        }
                        className={`inline-flex h-10 items-center justify-center rounded-control border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          room.isActive
                            ? "border-warning/30 bg-warning-soft text-warning"
                            : "border-success/30 bg-success-soft text-success"
                        }`}
                      >
                        {actionRoomId ===
                        room.id
                          ? "Updating..."
                          : room.isActive
                            ? "Make Inactive"
                            : "Activate"}
                      </button>

                      <div className="flex gap-2">
                        <Link
                          to={`/vendor/properties/${propertyId}/rooms/${room.id}/edit`}
                          className={`grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-text-secondary hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 ${
                            editingBlocked
                              ? "pointer-events-none opacity-40"
                              : ""
                          }`}
                        >
                          <EditIcon />
                        </Link>

                        <button
                          type="button"
                          disabled={
                            editingBlocked
                          }
                          onClick={() =>
                            setDeleteTarget(
                              room
                            )
                          }
                          className="grid h-10 w-10 place-items-center rounded-control border border-danger/20 bg-danger-soft text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            )}
          </section>
        )}

      {/* Empty */}

      {!loading &&
        !error &&
        filteredRooms.length === 0 && (
          <section className="rounded-dashboard-large border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary-700">
              <RoomIcon />
            </span>

            <h2 className="mt-5 text-2xl font-extrabold text-text-main">
              {rooms.length === 0
                ? "Add your first room type"
                : "No matching room types found"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              {rooms.length === 0
                ? "Create room categories with inventory, guest capacity, pricing, amenities and photos."
                : "Change the search term or room status filter and try again."}
            </p>

            {rooms.length === 0 ? (
              <Link
                to={`/vendor/properties/${propertyId}/rooms/new`}
                className={`mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-sm font-bold text-white ${
                  editingBlocked
                    ? "pointer-events-none bg-primary-300 opacity-60"
                    : "bg-primary-700"
                }`}
              >
                <PlusIcon />
                Add Room Type
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "ALL"
                  );
                }}
                className="mt-6 rounded-control border border-primary-300 bg-primary-50 px-5 py-2.5 text-sm font-bold text-primary-700"
              >
                Clear Filters
              </button>
            )}
          </section>
        )}

      {/* Delete Modal */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              if (
                !deleteSubmitting
              ) {
                setDeleteTarget(
                  null
                );
              }
            }}
          />

          <section className="relative z-10 w-full max-w-md rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard-dropdown">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
              <TrashIcon />
            </span>

            <h2 className="mt-4 text-xl font-extrabold text-text-main">
              Delete room type?
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              <strong className="text-text-main">
                {deleteTarget.name}
              </strong>{" "}
              and all its uploaded images
              will be permanently deleted.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  deleteSubmitting
                }
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
                className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  deleteSubmitting
                }
                onClick={() =>
                  void deleteRoom()
                }
                className="h-11 rounded-control bg-danger px-5 text-sm font-bold text-white disabled:opacity-60"
              >
                {deleteSubmitting
                  ? "Deleting..."
                  : "Delete Room Type"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

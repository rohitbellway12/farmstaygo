import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import api from "../../shared/api/api";
import { getAssetUrl } from "../../shared/config/assets";

type PropertyBookingType =
  | "ENTIRE_PROPERTY"
  | "ROOM_WISE"
  | "BOTH";

type PropertyStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "INACTIVE"
  | "SUSPENDED";

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

interface RoomTypeSummary {
  id: string;
  name: string;
  totalRooms: number;
  isActive: boolean;
}

interface VendorProperty {
  id: string;
  title: string;
  bookingType: PropertyBookingType;
  status: PropertyStatus;
  city: string | null;
  state: string | null;
  category: PropertyCategory;
  images: PropertyImage[];
  roomTypes: RoomTypeSummary[];
  _count: {
    images: number;
    amenities: number;
    roomTypes: number;
  };
}

interface PropertyListResponse {
  success: boolean;
  message: string;
  data: VendorProperty[];
  total: number;
}

interface ApiErrorResponse {
  message?: string;
}

const bookingTypeLabels: Record<
  PropertyBookingType,
  string
> = {
  ENTIRE_PROPERTY: "Entire Property",
  ROOM_WISE: "Room-wise Booking",
  BOTH: "Entire Property & Room-wise",
};

const statusLabels: Record<PropertyStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

interface CityRoomGroup {
  city: string;
  state: string;
  properties: VendorProperty[];
  roomTypeCount: number;
  roomUnitCount: number;
}

const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
};

export default function ManageRoomsPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<
    VendorProperty[]
  >([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get<PropertyListResponse>(
          "/vendor/properties",
          {
            params: {
              status: "ALL",
            },
          }
        );

      setProperties(response.data.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to fetch properties."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  const roomEnabledProperties = useMemo(
    () =>
      properties.filter(
        (property) =>
          property.bookingType === "ROOM_WISE" ||
          property.bookingType === "BOTH"
      ),
    [properties]
  );

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return roomEnabledProperties;
    }

    return roomEnabledProperties.filter((property) => {
      const haystack = [
        property.title,
        property.city,
        property.state,
        property.category.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [roomEnabledProperties, search]);

  const cityGroups = useMemo(() => {
    const groups = new Map<string, CityRoomGroup>();

    filteredProperties.forEach((property) => {
      const city =
        property.city || "City not added";
      const state =
        property.state || "";
      const key = `${city}|${state}`;
      const currentGroup =
        groups.get(key) || {
          city,
          state,
          properties: [],
          roomTypeCount: 0,
          roomUnitCount: 0,
        };

      currentGroup.properties.push(property);
      currentGroup.roomTypeCount +=
        property.roomTypes.length;
      currentGroup.roomUnitCount +=
        property.roomTypes.reduce(
          (sum, room) =>
            sum + room.totalRooms,
          0
        );

      groups.set(key, currentGroup);
    });

    return Array.from(groups.values()).sort(
      (firstGroup, secondGroup) =>
        firstGroup.city.localeCompare(
          secondGroup.city
        )
    );
  }, [filteredProperties]);

  return (
    <div className="space-y-5">
      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">
              Room Inventory
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-text-main">
              Manage Rooms
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
              Select a property that supports room-wise booking. Entire Property listings do not need room inventory.
            </p>
          </div>

          <Link
            to="/vendor/properties/new"
            className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800"
          >
            Add Property
          </Link>
        </div>
      </section>

      <section className="rounded-dashboard-card border border-border bg-surface p-4 shadow-dashboard-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search room-wise properties..."
            className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100 sm:max-w-md"
          />

          <div className="text-sm font-bold text-text-muted">
            {roomEnabledProperties.length} room-enabled properties
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-dashboard-card bg-surface-soft"
            />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <section className="rounded-dashboard-card border border-border bg-surface p-8 text-center shadow-dashboard-card">
          <h2 className="text-lg font-extrabold text-text-main">
            No room-wise properties found
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">
            Create or edit a property and choose Room-wise Booking or Entire Property & Room-wise. Then it will appear here for room inventory setup.
          </p>
          <Link
            to="/vendor/properties/new"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800"
          >
            Add Room-wise Property
          </Link>
        </section>
      ) : (
        <div className="space-y-5">
          {cityGroups.map((group) => (
            <section
              key={`${group.city}-${group.state}`}
              className="rounded-dashboard-large border border-border bg-surface p-4 shadow-dashboard"
            >
              <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary-700">
                    {group.state || "Location"}
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-text-main">
                    {group.city}
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-control bg-surface-soft px-3 py-2">
                    <strong className="block text-base text-text-main">
                      {group.properties.length}
                    </strong>
                    <span className="text-[11px] font-bold text-text-muted">
                      Properties
                    </span>
                  </div>
                  <div className="rounded-control bg-primary-50 px-3 py-2">
                    <strong className="block text-base text-primary-800">
                      {group.roomTypeCount}
                    </strong>
                    <span className="text-[11px] font-bold text-primary-700">
                      Room Types
                    </span>
                  </div>
                  <div className="rounded-control bg-success-soft px-3 py-2">
                    <strong className="block text-base text-success">
                      {group.roomUnitCount}
                    </strong>
                    <span className="text-[11px] font-bold text-success">
                      Total Rooms
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {group.properties.map((property) => {
            const image =
              property.images[0]?.image ||
              property.category.image;
            const location = [
              property.city,
              property.state,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <article
                key={property.id}
                className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card"
              >
                <div className="h-40 bg-surface-soft">
                  {image ? (
                    <img
                      src={getAssetUrl(image)}
                      alt={property.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm font-bold text-text-muted">
                      No image yet
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-700">
                        {property.category.name}
                      </p>
                      <h2 className="mt-1 truncate text-lg font-extrabold text-text-main">
                        {property.title}
                      </h2>
                    </div>
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary-700">
                      {statusLabels[property.status]}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-text-muted">
                    {location || "Location not added"}
                  </p>

                  <div className="mt-4 rounded-control border border-border bg-surface-soft px-3 py-2 text-sm font-bold text-text-secondary">
                    {bookingTypeLabels[property.bookingType]}
                  </div>

                  <div className="mt-4 rounded-control border border-border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-text-main">
                        Rooms in this property
                      </span>
                      <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary-700">
                        {property.roomTypes.length} types
                      </span>
                    </div>

                    {property.roomTypes.length === 0 ? (
                      <p className="mt-2 text-sm text-text-muted">
                        No room types added yet.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {property.roomTypes.map((room) => (
                          <span
                            key={room.id}
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              room.isActive
                                ? "bg-success-soft text-success"
                                : "bg-surface-soft text-text-muted"
                            }`}
                          >
                            {room.name} ({room.totalRooms})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/vendor/properties/${property.id}/rooms`
                        )
                      }
                      className="h-11 rounded-control bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800"
                    >
                      Manage Rooms
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/vendor/properties/${property.id}/rooms/new`
                        )
                      }
                      className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-bold text-text-secondary hover:bg-surface-soft"
                    >
                      Add Room
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

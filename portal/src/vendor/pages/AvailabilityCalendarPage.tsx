import axios from "axios";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
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

type CalendarMode =
  | "PROPERTY"
  | "ROOM";

type AvailabilityAction =
  | "BLOCK"
  | "UNBLOCK";

type DateStatus =
  | "AVAILABLE"
  | "PARTIAL"
  | "BLOCKED";

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
  bookingType: PropertyBookingType;
  status: PropertyStatus;
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

interface PropertyAvailabilityBlock {
  id: string;
  propertyId: string;
  date: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RoomAvailabilityBlock {
  id: string;
  roomTypeId: string;
  date: string;
  blockedRooms: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CalendarRoomType {
  id: string;
  name: string;
  slug: string;
  totalRooms: number;
  maxGuests: number;
  basePrice: string | number;
  weekendPrice: string | number | null;
  isActive: boolean;
  sortOrder: number;
  images: PropertyImage[];
  availabilityBlocks: RoomAvailabilityBlock[];
}

interface AvailabilityProperty {
  id: string;
  title: string;
  bookingType: PropertyBookingType;
  status: PropertyStatus;
  totalRooms: number | null;
  category: PropertyCategory;
  images: PropertyImage[];
}

interface AvailabilityData {
  dateRange: {
    startDate: string;
    endDate: string;
  };

  editable: boolean;

  propertyBlocks:
    PropertyAvailabilityBlock[];

  roomTypes: CalendarRoomType[];

  summary: {
    propertyBlockedDates: number;
    roomBlockedEntries: number;
    completePropertyUnavailableDates: number;
  };
}

interface AvailabilityResponse {
  success: boolean;
  message: string;
  property: AvailabilityProperty;
  data: AvailabilityData;
}

interface AvailabilityUpdateResponse {
  success: boolean;
  message: string;
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

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isPast: boolean;
}

interface CalendarDateState {
  status: DateStatus;
  label: string;
  note: string | null;
  blockedRooms?: number;
  availableRooms?: number;
}

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const bookingTypeLabels: Record<
  PropertyBookingType,
  string
> = {
  ENTIRE_PROPERTY:
    "Entire Property",

  ROOM_WISE:
    "Room-wise Booking",

  BOTH:
    "Entire Property & Room-wise",
};

const propertyStatusLabels: Record<
  PropertyStatus,
  string
> = {
  DRAFT: "Draft",
  PENDING_APPROVAL:
    "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

const weekDays = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

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
    storedPath.startsWith("/")
      ? ""
      : "/"
  }${storedPath}`;
};

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

const padNumber = (
  value: number
): string => {
  return String(value).padStart(
    2,
    "0"
  );
};

const formatDateKey = (
  date: Date
): string => {
  return [
    date.getFullYear(),
    padNumber(
      date.getMonth() + 1
    ),
    padNumber(date.getDate()),
  ].join("-");
};

const getDateKeyFromApi = (
  value: string
): string => {
  return value.slice(0, 10);
};

const getToday = (): Date => {
  const currentDate = new Date();

  return new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  );
};

const getMonthStart = (
  date: Date
): Date => {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
};

const getMonthEnd = (
  date: Date
): Date => {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );
};

const addDays = (
  date: Date,
  days: number
): Date => {
  const nextDate = new Date(date);

  nextDate.setDate(
    nextDate.getDate() + days
  );

  return nextDate;
};

const addMonths = (
  date: Date,
  months: number
): Date => {
  return new Date(
    date.getFullYear(),
    date.getMonth() + months,
    1
  );
};

const buildCalendarDays = (
  month: Date
): CalendarDay[] => {
  const monthStart =
    getMonthStart(month);

  const calendarStart =
    addDays(
      monthStart,
      -monthStart.getDay()
    );

  const today = getToday();

  return Array.from(
    {
      length: 42,
    },
    (_, index) => {
      const date =
        addDays(
          calendarStart,
          index
        );

      return {
        date,
        dateKey:
          formatDateKey(date),

        dayNumber:
          date.getDate(),

        inCurrentMonth:
          date.getMonth() ===
            month.getMonth() &&
          date.getFullYear() ===
            month.getFullYear(),

        isPast:
          date.getTime() <
          today.getTime(),
      };
    }
  );
};

const formatSelectedDate = (
  dateKey: string
): string => {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const countSelectedDates = (
  startDate: string,
  endDate: string
): number => {
  if (!startDate) {
    return 0;
  }

  const finalEndDate =
    endDate || startDate;

  const start =
    new Date(
      `${startDate}T00:00:00`
    );

  const end =
    new Date(
      `${finalEndDate}T00:00:00`
    );

  return (
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
        (
          24 *
          60 *
          60 *
          1000
        )
    ) + 1
  );
};

/*
|--------------------------------------------------------------------------
| API Error
|--------------------------------------------------------------------------
*/

const getApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (
    axios.isAxiosError<ApiErrorResponse>(
      error
    )
  ) {
    return (
      error.response?.data
        ?.message ||
      error.message ||
      fallback
    );
  }

  return fallback;
};

/*
|--------------------------------------------------------------------------
| Icons
|--------------------------------------------------------------------------
*/

function CalendarIcon() {
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

function PreviousIcon() {
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

function NextIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 18 6-6-6-6" />
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
| Main Page
|--------------------------------------------------------------------------
*/

export default function AvailabilityCalendarPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const queryPropertyId =
    searchParams.get(
      "propertyId"
    ) || "";

  const [
    properties,
    setProperties,
  ] = useState<VendorProperty[]>(
    []
  );

  const [
    selectedPropertyId,
    setSelectedPropertyId,
  ] = useState("");

  const [
    calendarData,
    setCalendarData,
  ] = useState<
    AvailabilityResponse | null
  >(null);

  const [
    currentMonth,
    setCurrentMonth,
  ] = useState(
    getMonthStart(new Date())
  );

  const [mode, setMode] =
    useState<CalendarMode>(
      "PROPERTY"
    );

  const [
    selectedRoomTypeId,
    setSelectedRoomTypeId,
  ] = useState("");

  const [
    selectedStartDate,
    setSelectedStartDate,
  ] = useState("");

  const [
    selectedEndDate,
    setSelectedEndDate,
  ] = useState("");

  const [
    availabilityAction,
    setAvailabilityAction,
  ] = useState<AvailabilityAction>(
    "BLOCK"
  );

  const [
    blockedRooms,
    setBlockedRooms,
  ] = useState("1");

  const [note, setNote] =
    useState("");

  const [
    propertiesLoading,
    setPropertiesLoading,
  ] = useState(true);

  const [
    calendarLoading,
    setCalendarLoading,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState<ToastState | null>(
      null
    );

  /*
  |--------------------------------------------------------------------------
  | Toast Timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => setToast(null),
        3500
      );

    return () =>
      window.clearTimeout(
        timeout
      );
  }, [toast]);

  /*
  |--------------------------------------------------------------------------
  | Load Properties
  |--------------------------------------------------------------------------
  */

  const loadProperties =
    useCallback(async () => {
      try {
        setPropertiesLoading(true);
        setError("");

        const response =
          await api.get<PropertiesResponse>(
            "/vendor/properties"
          );

        const propertyList =
          response.data.data || [];

        setProperties(
          propertyList
        );

        if (
          propertyList.length === 0
        ) {
          setSelectedPropertyId(
            ""
          );

          return;
        }

        const requestedProperty =
          propertyList.find(
            (property) =>
              property.id ===
              queryPropertyId
          );

        setSelectedPropertyId(
          requestedProperty?.id ||
            propertyList[0].id
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load properties."
          )
        );
      } finally {
        setPropertiesLoading(
          false
        );
      }
    }, [queryPropertyId]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  /*
  |--------------------------------------------------------------------------
  | Selected Property
  |--------------------------------------------------------------------------
  */

  const selectedProperty =
    useMemo(() => {
      return (
        properties.find(
          (property) =>
            property.id ===
            selectedPropertyId
        ) || null
      );
    }, [
      properties,
      selectedPropertyId,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Property Change Rules
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!selectedProperty) {
      return;
    }

    if (
      selectedProperty.bookingType ===
      "ROOM_WISE"
    ) {
      setMode("ROOM");
    } else {
      setMode("PROPERTY");
    }

    setSelectedRoomTypeId("");
    setSelectedStartDate("");
    setSelectedEndDate("");
    setAvailabilityAction(
      "BLOCK"
    );
    setBlockedRooms("1");
    setNote("");
  }, [selectedProperty]);

  /*
  |--------------------------------------------------------------------------
  | Load Calendar
  |--------------------------------------------------------------------------
  */

  const loadCalendar =
    useCallback(async () => {
      if (!selectedPropertyId) {
        setCalendarData(null);
        return;
      }

      const monthStart =
        getMonthStart(
          currentMonth
        );

      const monthEnd =
        getMonthEnd(
          currentMonth
        );

      try {
        setCalendarLoading(true);
        setError("");

        const response =
          await api.get<AvailabilityResponse>(
            `/vendor/properties/${selectedPropertyId}/availability`,
            {
              params: {
                startDate:
                  formatDateKey(
                    monthStart
                  ),

                endDate:
                  formatDateKey(
                    monthEnd
                  ),
              },
            }
          );

        setCalendarData(
          response.data
        );
      } catch (requestError) {
        setCalendarData(null);

        setError(
          getApiErrorMessage(
            requestError,
            "Unable to load availability calendar."
          )
        );
      } finally {
        setCalendarLoading(false);
      }
    }, [
      currentMonth,
      selectedPropertyId,
    ]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  /*
  |--------------------------------------------------------------------------
  | Default Room Selection
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      mode !== "ROOM" ||
      !calendarData
    ) {
      return;
    }

    const roomTypes =
      calendarData.data
        .roomTypes;

    if (
      roomTypes.length === 0
    ) {
      setSelectedRoomTypeId(
        ""
      );

      return;
    }

    const selectedRoomStillExists =
      roomTypes.some(
        (roomType) =>
          roomType.id ===
          selectedRoomTypeId
      );

    if (
      !selectedRoomStillExists
    ) {
      const activeRoom =
        roomTypes.find(
          (roomType) =>
            roomType.isActive
        );

      setSelectedRoomTypeId(
        activeRoom?.id ||
          roomTypes[0].id
      );
    }
  }, [
    calendarData,
    mode,
    selectedRoomTypeId,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Selected Room
  |--------------------------------------------------------------------------
  */

  const selectedRoomType =
    useMemo(() => {
      return (
        calendarData?.data
          .roomTypes.find(
            (roomType) =>
              roomType.id ===
              selectedRoomTypeId
          ) || null
      );
    }, [
      calendarData,
      selectedRoomTypeId,
    ]);

  useEffect(() => {
    setBlockedRooms("1");
  }, [selectedRoomTypeId]);

  /*
  |--------------------------------------------------------------------------
  | Calendar Days
  |--------------------------------------------------------------------------
  */

  const calendarDays =
    useMemo(
      () =>
        buildCalendarDays(
          currentMonth
        ),
      [currentMonth]
    );

  /*
  |--------------------------------------------------------------------------
  | Availability Maps
  |--------------------------------------------------------------------------
  */

  const propertyBlockMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          PropertyAvailabilityBlock
        >();

      calendarData?.data
        .propertyBlocks.forEach(
          (block) => {
            map.set(
              getDateKeyFromApi(
                block.date
              ),
              block
            );
          }
        );

      return map;
    }, [calendarData]);

  const selectedRoomBlockMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          RoomAvailabilityBlock
        >();

      selectedRoomType
        ?.availabilityBlocks.forEach(
          (block) => {
            map.set(
              getDateKeyFromApi(
                block.date
              ),
              block
            );
          }
        );

      return map;
    }, [selectedRoomType]);

  const roomConflictDates =
    useMemo(() => {
      const dates =
        new Set<string>();

      calendarData?.data
        .roomTypes.forEach(
          (roomType) => {
            roomType
              .availabilityBlocks
              .forEach((block) => {
                dates.add(
                  getDateKeyFromApi(
                    block.date
                  )
                );
              });
          }
        );

      return dates;
    }, [calendarData]);

  /*
  |--------------------------------------------------------------------------
  | Date State
  |--------------------------------------------------------------------------
  */

  const getCalendarDateState = (
    dateKey: string
  ): CalendarDateState => {
    const propertyBlock =
      propertyBlockMap.get(
        dateKey
      );

    if (mode === "PROPERTY") {
      if (propertyBlock) {
        return {
          status: "BLOCKED",
          label: "Blocked",
          note:
            propertyBlock.note,
        };
      }

      if (
        selectedProperty
          ?.bookingType ===
          "BOTH" &&
        roomConflictDates.has(
          dateKey
        )
      ) {
        return {
          status: "BLOCKED",
          label:
            "Room unavailable",
          note:
            "One or more room types are blocked.",
        };
      }

      return {
        status: "AVAILABLE",
        label: "Available",
        note: null,
      };
    }

    if (propertyBlock) {
      return {
        status: "BLOCKED",
        label:
          "Property blocked",
        note:
          propertyBlock.note,
      };
    }

    const roomBlock =
      selectedRoomBlockMap.get(
        dateKey
      );

    if (
      roomBlock &&
      selectedRoomType
    ) {
      const availableRooms =
        Math.max(
          selectedRoomType
            .totalRooms -
            roomBlock.blockedRooms,
          0
        );

      if (
        roomBlock.blockedRooms >=
        selectedRoomType.totalRooms
      ) {
        return {
          status: "BLOCKED",
          label:
            "Fully blocked",
          note:
            roomBlock.note,
          blockedRooms:
            roomBlock.blockedRooms,
          availableRooms: 0,
        };
      }

      return {
        status: "PARTIAL",
        label: `${roomBlock.blockedRooms} blocked`,
        note: roomBlock.note,
        blockedRooms:
          roomBlock.blockedRooms,
        availableRooms,
      };
    }

    return {
      status: "AVAILABLE",
      label: selectedRoomType
        ? `${selectedRoomType.totalRooms} available`
        : "Available",

      note: null,

      availableRooms:
        selectedRoomType
          ?.totalRooms,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Date Selection
  |--------------------------------------------------------------------------
  */

  const clearSelection = () => {
    setSelectedStartDate("");
    setSelectedEndDate("");
    setNote("");
  };

  const selectCalendarDate = (
    day: CalendarDay
  ) => {
    if (
      !day.inCurrentMonth ||
      day.isPast ||
      !calendarData?.data
        .editable
    ) {
      return;
    }

    if (
      mode === "ROOM" &&
      !selectedRoomType
    ) {
      return;
    }

    if (
      mode === "ROOM" &&
      selectedRoomType &&
      !selectedRoomType.isActive
    ) {
      setToast({
        type: "error",
        message:
          "Inactive room types cannot be edited.",
      });

      return;
    }

    if (
      !selectedStartDate ||
      selectedEndDate
    ) {
      setSelectedStartDate(
        day.dateKey
      );

      setSelectedEndDate("");

      return;
    }

    if (
      day.dateKey <
      selectedStartDate
    ) {
      setSelectedEndDate(
        selectedStartDate
      );

      setSelectedStartDate(
        day.dateKey
      );

      return;
    }

    setSelectedEndDate(
      day.dateKey
    );
  };

  const dateIsSelected = (
    dateKey: string
  ): boolean => {
    if (!selectedStartDate) {
      return false;
    }

    const finalEndDate =
      selectedEndDate ||
      selectedStartDate;

    return (
      dateKey >=
        selectedStartDate &&
      dateKey <= finalEndDate
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Submit Availability
  |--------------------------------------------------------------------------
  */

  const submitAvailability =
    async () => {
      if (
        !selectedPropertyId
      ) {
        setToast({
          type: "error",
          message:
            "Please select a property.",
        });

        return;
      }

      if (
        !selectedStartDate
      ) {
        setToast({
          type: "error",
          message:
            "Please select at least one calendar date.",
        });

        return;
      }

      if (
        !calendarData?.data
          .editable
      ) {
        setToast({
          type: "error",
          message:
            "Availability editing is blocked for this property.",
        });

        return;
      }

      const startDate =
        selectedStartDate;

      const endDate =
        selectedEndDate ||
        selectedStartDate;

      try {
        setSubmitting(true);

        let response:
          | {
              data: AvailabilityUpdateResponse;
            }
          | undefined;

        if (mode === "PROPERTY") {
          response =
            await api.put<AvailabilityUpdateResponse>(
              `/vendor/properties/${selectedPropertyId}/availability/property-blocks`,
              {
                startDate,
                endDate,
                action:
                  availabilityAction,

                note:
                  note.trim() ||
                  null,
              }
            );
        } else {
          if (!selectedRoomType) {
            setToast({
              type: "error",
              message:
                "Please select a room type.",
            });

            return;
          }

          let parsedBlockedRooms =
            0;

          if (
            availabilityAction ===
            "BLOCK"
          ) {
            parsedBlockedRooms =
              Number(
                blockedRooms
              );

            if (
              !Number.isInteger(
                parsedBlockedRooms
              ) ||
              parsedBlockedRooms <
                1
            ) {
              setToast({
                type: "error",
                message:
                  "Blocked rooms must be at least 1.",
              });

              return;
            }

            if (
              parsedBlockedRooms >
              selectedRoomType
                .totalRooms
            ) {
              setToast({
                type: "error",
                message:
                  `This room type contains only ${selectedRoomType.totalRooms} rooms.`,
              });

              return;
            }
          }

          response =
            await api.put<AvailabilityUpdateResponse>(
              `/vendor/properties/${selectedPropertyId}/availability/rooms/${selectedRoomType.id}/blocks`,
              {
                startDate,
                endDate,
                action:
                  availabilityAction,

                blockedRooms:
                  availabilityAction ===
                  "BLOCK"
                    ? parsedBlockedRooms
                    : undefined,

                note:
                  note.trim() ||
                  null,
              }
            );
        }

        setToast({
          type: "success",
          message:
            response.data.message,
        });

        clearSelection();

        await loadCalendar();
      } catch (requestError) {
        setToast({
          type: "error",
          message:
            getApiErrorMessage(
              requestError,
              "Unable to update availability."
            ),
        });
      } finally {
        setSubmitting(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Property Selection
  |--------------------------------------------------------------------------
  */

  const selectProperty = (
    propertyId: string
  ) => {
    setSelectedPropertyId(
      propertyId
    );

    setSearchParams(
      propertyId
        ? {
            propertyId,
          }
        : {}
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Calculated Values
  |--------------------------------------------------------------------------
  */

  const selectedDateCount =
    countSelectedDates(
      selectedStartDate,
      selectedEndDate
    );

  const propertyCover =
    selectedProperty?.images[0]
      ?.image ||
    selectedProperty?.category
      .image;

  const monthLabel =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    ).format(currentMonth);

  const modeCanUseProperty =
    selectedProperty
      ?.bookingType ===
      "ENTIRE_PROPERTY" ||
    selectedProperty
      ?.bookingType ===
      "BOTH";

  const modeCanUseRooms =
    selectedProperty
      ?.bookingType ===
      "ROOM_WISE" ||
    selectedProperty
      ?.bookingType ===
      "BOTH";

  return (
    <div className="space-y-5">
      {/* Toast */}

      {toast && (
        <div
          className={`fixed right-5 top-20 z-[100] flex max-w-sm items-start gap-3 rounded-dashboard-card border px-4 py-3 shadow-dashboard-dropdown ${
            toast.type ===
            "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${
              toast.type ===
              "success"
                ? "bg-success"
                : "bg-danger"
            }`}
          >
            {toast.type ===
            "success"
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
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <CalendarIcon />
            </span>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-primary-700">
                Availability Management
              </p>

              <h1 className="mt-1 text-2xl font-extrabold text-text-main sm:text-3xl">
                Availability Calendar
              </h1>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                Block complete properties or
                manage room inventory for
                selected dates.
              </p>
            </div>
          </div>

          <div className="w-full lg:max-w-sm">
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.12em] text-text-muted">
              Select Property
            </label>

            <select
              value={
                selectedPropertyId
              }
              disabled={
                propertiesLoading
              }
              onChange={(event) =>
                selectProperty(
                  event.target.value
                )
              }
              className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-bold text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100 disabled:opacity-60"
            >
              {properties.length ===
                0 && (
                <option value="">
                  No properties available
                </option>
              )}

              {properties.map(
                (property) => (
                  <option
                    key={property.id}
                    value={property.id}
                  >
                    {property.title} —{" "}
                    {
                      bookingTypeLabels[
                        property
                          .bookingType
                      ]
                    }
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      {/* Error */}

      {error && (
        <section className="rounded-dashboard-card border border-danger/20 bg-danger-soft p-5">
          <p className="font-bold text-danger">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              void loadProperties();
              void loadCalendar();
            }}
            className="mt-3 rounded-control bg-danger px-4 py-2 text-sm font-bold text-white"
          >
            Try Again
          </button>
        </section>
      )}

      {/* No Properties */}

      {!propertiesLoading &&
        properties.length === 0 && (
          <section className="rounded-dashboard-large border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary-700">
              <CalendarIcon />
            </span>

            <h2 className="mt-5 text-2xl font-extrabold text-text-main">
              No properties available
            </h2>

            <p className="mt-2 text-sm text-text-muted">
              Add a property before
              configuring availability.
            </p>
          </section>
        )}

      {/* Calendar Content */}

      {selectedProperty &&
        properties.length > 0 && (
          <>
            {/* Property Summary */}

            <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard">
              <div className="flex flex-col md:flex-row">
                <div className="h-44 bg-primary-50 md:h-auto md:w-56">
                  {propertyCover ? (
                    <img
                      src={getAssetUrl(
                        propertyCover
                      )}
                      alt={
                        selectedProperty.title
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-primary-700">
                      <CalendarIcon />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary-700">
                      {
                        selectedProperty
                          .category.name
                      }
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-text-main">
                      {
                        selectedProperty.title
                      }
                    </h2>

                    <p className="mt-2 text-sm text-text-muted">
                      {[
                        selectedProperty.city,
                        selectedProperty.state,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "Location not added"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                        {
                          bookingTypeLabels[
                            selectedProperty
                              .bookingType
                          ]
                        }
                      </span>

                      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-bold text-text-secondary">
                        {
                          propertyStatusLabels[
                            selectedProperty
                              .status
                          ]
                        }
                      </span>
                    </div>
                  </div>

                  {calendarData && (
                    <div className="grid min-w-72 grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-surface-soft p-3">
                        <strong className="block text-xl font-extrabold text-text-main">
                          {
                            calendarData
                              .data.summary
                              .propertyBlockedDates
                          }
                        </strong>

                        <span className="text-xs text-text-muted">
                          Property Blocks
                        </span>
                      </div>

                      <div className="rounded-lg bg-surface-soft p-3">
                        <strong className="block text-xl font-extrabold text-text-main">
                          {
                            calendarData
                              .data.summary
                              .roomBlockedEntries
                          }
                        </strong>

                        <span className="text-xs text-text-muted">
                          Room Blocks
                        </span>
                      </div>

                      <div className="rounded-lg bg-surface-soft p-3">
                        <strong className="block text-xl font-extrabold text-text-main">
                          {
                            calendarData
                              .data.roomTypes
                              .length
                          }
                        </strong>

                        <span className="text-xs text-text-muted">
                          Room Types
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Editing Warning */}

            {calendarData &&
              !calendarData.data
                .editable && (
                <section className="rounded-dashboard-card border border-warning/20 bg-warning-soft p-4 text-sm font-semibold text-warning">
                  {selectedProperty.status ===
                  "PENDING_APPROVAL"
                    ? "Availability editing is temporarily blocked while the property is under Admin review."
                    : "Availability editing is blocked because this property is suspended."}
                </section>
              )}

            {/* Main Grid */}

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              {/* Calendar */}

              <section className="overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard">
                {/* Mode and Month */}

                <div className="border-b border-border p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {modeCanUseProperty && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode(
                              "PROPERTY"
                            );

                            clearSelection();
                          }}
                          className={`h-10 rounded-control px-4 text-sm font-bold transition ${
                            mode ===
                            "PROPERTY"
                              ? "bg-primary-700 text-white"
                              : "border border-border bg-surface text-text-secondary hover:bg-surface-soft"
                          }`}
                        >
                          Entire Property
                        </button>
                      )}

                      {modeCanUseRooms && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode(
                              "ROOM"
                            );

                            clearSelection();
                          }}
                          className={`h-10 rounded-control px-4 text-sm font-bold transition ${
                            mode ===
                            "ROOM"
                              ? "bg-primary-700 text-white"
                              : "border border-border bg-surface text-text-secondary hover:bg-surface-soft"
                          }`}
                        >
                          Room Inventory
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMonth(
                            addMonths(
                              currentMonth,
                              -1
                            )
                          );

                          clearSelection();
                        }}
                        className="grid h-10 w-10 place-items-center rounded-control border border-border text-text-secondary hover:bg-surface-soft"
                      >
                        <PreviousIcon />
                      </button>

                      <strong className="min-w-40 text-center text-base font-extrabold text-text-main">
                        {monthLabel}
                      </strong>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMonth(
                            addMonths(
                              currentMonth,
                              1
                            )
                          );

                          clearSelection();
                        }}
                        className="grid h-10 w-10 place-items-center rounded-control border border-border text-text-secondary hover:bg-surface-soft"
                      >
                        <NextIcon />
                      </button>
                    </div>
                  </div>

                  {/* Room Selector */}

                  {mode === "ROOM" && (
                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-bold text-text-secondary">
                        Room Type
                      </label>

                      <select
                        value={
                          selectedRoomTypeId
                        }
                        onChange={(event) => {
                          setSelectedRoomTypeId(
                            event.target.value
                          );

                          clearSelection();
                        }}
                        className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm font-bold text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                      >
                        {calendarData?.data
                          .roomTypes.length ===
                          0 && (
                          <option value="">
                            No room types available
                          </option>
                        )}

                        {calendarData?.data
                          .roomTypes.map(
                            (roomType) => (
                              <option
                                key={
                                  roomType.id
                                }
                                value={
                                  roomType.id
                                }
                              >
                                {
                                  roomType.name
                                }{" "}
                                —{" "}
                                {
                                  roomType.totalRooms
                                }{" "}
                                rooms
                                {!roomType.isActive
                                  ? " (Inactive)"
                                  : ""}
                              </option>
                            )
                          )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Legend */}

                <div className="flex flex-wrap gap-4 border-b border-border bg-surface-soft px-4 py-3 text-xs font-semibold text-text-muted sm:px-5">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-success" />
                    Available
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-warning" />
                    Partially Blocked
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-danger" />
                    Fully Blocked
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary-700" />
                    Selected
                  </span>
                </div>

                {/* Calendar Grid */}

                <div className="overflow-x-auto">
                  <div className="min-w-[720px] p-4 sm:p-5">
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map(
                        (weekDay) => (
                          <div
                            key={weekDay}
                            className="py-2 text-center text-xs font-extrabold uppercase tracking-[0.1em] text-text-muted"
                          >
                            {weekDay}
                          </div>
                        )
                      )}

                      {calendarDays.map(
                        (day) => {
                          const dateState =
                            getCalendarDateState(
                              day.dateKey
                            );

                          const selected =
                            dateIsSelected(
                              day.dateKey
                            );

                          const disabled =
                            !day.inCurrentMonth ||
                            day.isPast ||
                            !calendarData
                              ?.data
                              .editable ||
                            (
                              mode ===
                                "ROOM" &&
                              (
                                !selectedRoomType ||
                                !selectedRoomType.isActive
                              )
                            );

                          return (
                            <button
                              type="button"
                              key={
                                day.dateKey
                              }
                              disabled={
                                disabled
                              }
                              onClick={() =>
                                selectCalendarDate(
                                  day
                                )
                              }
                              className={`relative min-h-28 rounded-dashboard-card border p-2.5 text-left transition ${
                                !day.inCurrentMonth
                                  ? "border-transparent bg-surface-soft/40 opacity-35"
                                  : selected
                                    ? "border-primary-700 bg-primary-50 ring-2 ring-primary-200"
                                    : dateState.status ===
                                        "BLOCKED"
                                      ? "border-danger/20 bg-danger-soft"
                                      : dateState.status ===
                                          "PARTIAL"
                                        ? "border-warning/20 bg-warning-soft"
                                        : "border-border bg-surface hover:border-primary-300 hover:bg-primary-50"
                              } ${
                                disabled
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <strong
                                  className={`grid h-7 w-7 place-items-center rounded-full text-sm ${
                                    selected
                                      ? "bg-primary-700 text-white"
                                      : "text-text-main"
                                  }`}
                                >
                                  {
                                    day.dayNumber
                                  }
                                </strong>

                                {day.inCurrentMonth &&
                                  !day.isPast && (
                                    <span
                                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                                        dateState.status ===
                                        "BLOCKED"
                                          ? "bg-danger"
                                          : dateState.status ===
                                              "PARTIAL"
                                            ? "bg-warning"
                                            : "bg-success"
                                      }`}
                                    />
                                  )}
                              </div>

                              {day.inCurrentMonth && (
                                <div className="mt-3">
                                  {day.isPast ? (
                                    <span className="text-xs font-semibold text-text-soft">
                                      Past date
                                    </span>
                                  ) : (
                                    <>
                                      <span
                                        className={`block text-xs font-bold ${
                                          dateState.status ===
                                          "BLOCKED"
                                            ? "text-danger"
                                            : dateState.status ===
                                                "PARTIAL"
                                              ? "text-warning"
                                              : "text-success"
                                        }`}
                                      >
                                        {
                                          dateState.label
                                        }
                                      </span>

                                      {dateState.availableRooms !==
                                        undefined && (
                                        <span className="mt-1 block text-[11px] text-text-muted">
                                          {
                                            dateState.availableRooms
                                          }{" "}
                                          remaining
                                        </span>
                                      )}

                                      {dateState.note && (
                                        <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-text-muted">
                                          {
                                            dateState.note
                                          }
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                {calendarLoading && (
                  <div className="absolute inset-0" />
                )}
              </section>

              {/* Action Panel */}

              <aside className="space-y-5 xl:sticky xl:top-[86px]">
                {mode === "ROOM" &&
                  selectedRoomType && (
                    <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
                      <div className="flex items-start gap-3">
                        {selectedRoomType
                          .images[0]
                          ?.image ? (
                          <img
                            src={getAssetUrl(
                              selectedRoomType
                                .images[0]
                                .image
                            )}
                            alt={
                              selectedRoomType.name
                            }
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="grid h-14 w-14 place-items-center rounded-xl bg-primary-50 text-primary-700">
                            <CalendarIcon />
                          </span>
                        )}

                        <div>
                          <h2 className="font-extrabold text-text-main">
                            {
                              selectedRoomType.name
                            }
                          </h2>

                          <p className="mt-1 text-sm text-text-muted">
                            {
                              selectedRoomType.totalRooms
                            }{" "}
                            total rooms
                          </p>

                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              selectedRoomType.isActive
                                ? "bg-success-soft text-success"
                                : "bg-surface-muted text-text-muted"
                            }`}
                          >
                            {selectedRoomType.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </section>
                  )}

                <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
                  <h2 className="text-lg font-extrabold text-text-main">
                    Selected Dates
                  </h2>

                  {!selectedStartDate ? (
                    <p className="mt-3 rounded-control bg-surface-soft p-4 text-sm leading-6 text-text-muted">
                      Select one date or a
                      date range from the
                      calendar.
                    </p>
                  ) : (
                    <div className="mt-4 rounded-dashboard-card bg-primary-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-primary-700">
                          Start
                        </span>

                        <strong className="text-sm text-primary-800">
                          {formatSelectedDate(
                            selectedStartDate
                          )}
                        </strong>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-primary-700">
                          End
                        </span>

                        <strong className="text-sm text-primary-800">
                          {formatSelectedDate(
                            selectedEndDate ||
                              selectedStartDate
                          )}
                        </strong>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-primary-200 pt-3">
                        <span className="text-sm font-semibold text-primary-700">
                          Total Dates
                        </span>

                        <strong className="text-lg text-primary-800">
                          {
                            selectedDateCount
                          }
                        </strong>
                      </div>

                      <button
                        type="button"
                        onClick={
                          clearSelection
                        }
                        className="mt-4 w-full rounded-control border border-primary-300 bg-surface px-4 py-2 text-sm font-bold text-primary-700"
                      >
                        Clear Selection
                      </button>
                    </div>
                  )}
                </section>

                <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
                  <h2 className="text-lg font-extrabold text-text-main">
                    Availability Action
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-control bg-surface-soft p-1">
                    <button
                      type="button"
                      onClick={() =>
                        setAvailabilityAction(
                          "BLOCK"
                        )
                      }
                      className={`h-10 rounded-lg text-sm font-bold ${
                        availabilityAction ===
                        "BLOCK"
                          ? "bg-danger text-white shadow-sm"
                          : "text-text-secondary"
                      }`}
                    >
                      Block
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setAvailabilityAction(
                          "UNBLOCK"
                        )
                      }
                      className={`h-10 rounded-lg text-sm font-bold ${
                        availabilityAction ===
                        "UNBLOCK"
                          ? "bg-success text-white shadow-sm"
                          : "text-text-secondary"
                      }`}
                    >
                      Unblock
                    </button>
                  </div>

                  {mode === "ROOM" &&
                    availabilityAction ===
                      "BLOCK" &&
                    selectedRoomType && (
                      <div className="mt-5">
                        <label className="mb-2 block text-sm font-bold text-text-secondary">
                          Blocked Room Quantity
                        </label>

                        <input
                          type="number"
                          min="1"
                          max={
                            selectedRoomType.totalRooms
                          }
                          step="1"
                          value={
                            blockedRooms
                          }
                          onChange={(event) =>
                            setBlockedRooms(
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                        />

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setBlockedRooms(
                                "1"
                              )
                            }
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-text-secondary"
                          >
                            Block 1
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setBlockedRooms(
                                String(
                                  selectedRoomType.totalRooms
                                )
                              )
                            }
                            className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-bold text-danger"
                          >
                            Block All
                          </button>
                        </div>

                        <p className="mt-3 text-xs leading-5 text-text-muted">
                          Maximum available
                          inventory:{" "}
                          <strong>
                            {
                              selectedRoomType.totalRooms
                            }
                          </strong>
                        </p>
                      </div>
                    )}

                  {availabilityAction ===
                    "BLOCK" && (
                    <label className="mt-5 block">
                      <span className="mb-2 block text-sm font-bold text-text-secondary">
                        Note{" "}
                        <span className="font-normal text-text-soft">
                          (Optional)
                        </span>
                      </span>

                      <textarea
                        rows={3}
                        maxLength={300}
                        value={note}
                        onChange={(event) =>
                          setNote(
                            event.target.value
                          )
                        }
                        placeholder="Maintenance, private event, owner unavailable..."
                        className="w-full resize-none rounded-control border border-border bg-surface px-4 py-3 text-sm leading-6 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                      />

                      <span className="mt-1 block text-right text-xs text-text-soft">
                        {note.length}/300
                      </span>
                    </label>
                  )}

                  <button
                    type="button"
                    disabled={
                      submitting ||
                      !selectedStartDate ||
                      !calendarData?.data
                        .editable ||
                      (
                        mode ===
                          "ROOM" &&
                        (
                          !selectedRoomType ||
                          !selectedRoomType.isActive
                        )
                      )
                    }
                    onClick={() =>
                      void submitAvailability()
                    }
                    className={`mt-5 h-11 w-full rounded-control px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      availabilityAction ===
                      "BLOCK"
                        ? "bg-danger hover:bg-danger/90"
                        : "bg-success hover:bg-success/90"
                    }`}
                  >
                    {submitting
                      ? "Saving..."
                      : availabilityAction ===
                          "BLOCK"
                        ? mode ===
                          "PROPERTY"
                          ? "Block Selected Dates"
                          : "Save Blocked Inventory"
                        : "Unblock Selected Dates"}
                  </button>
                </section>

                <section className="rounded-dashboard-card border border-info/20 bg-info-soft p-4 text-sm leading-6 text-info">
                  <strong className="block">
                    Calendar rule
                  </strong>

                  <span className="mt-1 block">
                    No block record means
                    that the property or room
                    inventory is available by
                    default.
                  </span>
                </section>
          </aside>
            </div>
          </>
        )}
    </div>
  );
}
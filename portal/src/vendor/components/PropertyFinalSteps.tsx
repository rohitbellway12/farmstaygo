import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";

import api from "../../shared/api/api";
import { getAssetUrl } from "../../shared/config/assets";

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

type AmenityGroup =
  | "POPULAR"
  | "BASIC"
  | "OUTDOOR"
  | "INDOOR"
  | "SAFETY"
  | "KITCHEN"
  | "ENTERTAINMENT"
  | "ACCESSIBILITY";

interface Amenity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  group: AmenityGroup;
  sortOrder: number;
}

interface PropertyImage {
  id: string;
  image: string;
  isCover: boolean;
  sortOrder: number;
}

interface PropertyAmenity {
  amenityId: string;
  amenity: Amenity;
}

interface PropertyRule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface PropertyDetails {
  id: string;
  title: string;
  bookingType: string;
  status: PropertyStatus;

  shortDescription: string | null;
  description: string | null;
  maxGuests: number | null;

  addressLine1: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;

  basePrice: string | number | null;
  weekendPrice: string | number | null;
  cleaningFee: string | number | null;
  securityDeposit:
    | string
    | number
    | null;
  reservationAmount:
    | string
    | number
    | null;

  checkInTime: string | null;
  checkOutTime: string | null;
  minimumStay: number;
  instantBook: boolean;

  rejectionReason: string | null;

  category: {
    id: string;
    name: string;
  };

  images: PropertyImage[];
  amenities: PropertyAmenity[];
  rules: PropertyRule[];
}

interface PricingFormState {
  basePrice: string;
  weekendPrice: string;
  cleaningFee: string;
  securityDeposit: string;
  reservationAmount: string;
  checkInTime: string;
  checkOutTime: string;
  minimumStay: string;
  instantBook: boolean;
}

interface RoomType {
  id: string;
  name: string;
  totalRooms: number;
  basePrice: string | number;
  weekendPrice: string | number | null;
  reservationAmount:
    | string
    | number
    | null;
  isActive: boolean;
}

interface RoomInventoryResponse {
  success: boolean;
  message: string;
  data: RoomType[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface MissingSection {
  step: number;
  title: string;
  message: string;
}

interface SubmitErrorResponse {
  message?: string;

  errors?: Record<string, string>;

  data?: {
    missingSections?: MissingSection[];
  };
}

interface PropertyRule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface PropertyFinalStepsProps {
  propertyId: string;
  activeStep: 4 | 5 | 6 | 7;
  editingBlocked: boolean;

  onChangeStep: (
    step: 1 | 2 | 3 | 4 | 5 | 6 | 7
  ) => void;

  onStatusChange: (
    status: PropertyStatus
  ) => void;
}

type PricingErrors = Partial<
  Record<keyof PricingFormState, string>
>;

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const groupLabels: Record<
  AmenityGroup,
  string
> = {
  POPULAR: "Popular Amenities",
  BASIC: "Basic Facilities",
  OUTDOOR: "Outdoor Facilities",
  INDOOR: "Indoor Facilities",
  SAFETY: "Safety Features",
  KITCHEN: "Kitchen Facilities",
  ENTERTAINMENT: "Entertainment",
  ACCESSIBILITY: "Accessibility",
};

const groupOrder: AmenityGroup[] = [
  "POPULAR",
  "BASIC",
  "OUTDOOR",
  "INDOOR",
  "KITCHEN",
  "ENTERTAINMENT",
  "SAFETY",
  "ACCESSIBILITY",
];

const emptyPricingForm: PricingFormState =
  {
    basePrice: "",
    weekendPrice: "",
    cleaningFee: "",
    securityDeposit: "",
    reservationAmount: "",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    minimumStay: "1",
    instantBook: false,
  };

/*
|--------------------------------------------------------------------------
| Helpers
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

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const getErrorDetails = (
  error: unknown
): {
  message: string;
  errors: Record<string, string>;
  missingSections: MissingSection[];
} => {
  if (
    axios.isAxiosError<SubmitErrorResponse>(
      error
    )
  ) {
    return {
      message:
        error.response?.data?.message ||
        "Unable to complete the request.",

      errors:
        error.response?.data?.errors ||
        {},

      missingSections:
        error.response?.data?.data
          ?.missingSections || [],
    };
  }

  return {
    message:
      "Unable to complete the request. Please try again.",
    errors: {},
    missingSections: [],
  };
};

/*
|--------------------------------------------------------------------------
| Components
|--------------------------------------------------------------------------
*/

function FieldError({
  message,
}: {
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-1.5 text-sm font-semibold text-red-600">
      {message}
    </p>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      className="h-5 w-5"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

export default function PropertyFinalSteps({
  propertyId,
  activeStep,
  editingBlocked,
  onChangeStep,
  onStatusChange,
}: PropertyFinalStepsProps) {
  const [property, setProperty] =
    useState<PropertyDetails | null>(null);

  const [amenities, setAmenities] =
    useState<Amenity[]>([]);

  const [selectedAmenityIds, setSelectedAmenityIds] =
    useState<string[]>([]);

  const [rules, setRules] = useState<
    PropertyRule[]
  >([]);

  const [selectedRuleIds, setSelectedRuleIds] =
    useState<string[]>([]);

  const [pricingForm, setPricingForm] =
    useState<PricingFormState>(
      emptyPricingForm
    );

  const [pricingErrors, setPricingErrors] =
    useState<PricingErrors>({});

  const [roomTypes, setRoomTypes] =
    useState<RoomType[]>([]);

  const [amenitySearch, setAmenitySearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [pageError, setPageError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [missingSections, setMissingSections] =
    useState<MissingSection[]>([]);
  const [
    submitConfirmOpen,
    setSubmitConfirmOpen,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Load Property and Amenities
  |--------------------------------------------------------------------------
  */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const [
        propertyResponse,
        amenityResponse,
        ruleResponse,
      ] = await Promise.all([
        api.get<ApiResponse<PropertyDetails>>(
          `/vendor/properties/${propertyId}`
        ),

        api.get<ApiResponse<Amenity[]>>(
          "/vendor/amenities"
        ),

        api.get<ApiResponse<PropertyRule[]>>(
          "/vendor/property-rules"
        ),
      ]);

      const loadedProperty =
        propertyResponse.data.data;

      setProperty(loadedProperty);

      setAmenities(
        amenityResponse.data.data
      );

      setSelectedAmenityIds(
        loadedProperty.amenities.map(
          (item) => item.amenityId
        )
      );

      setRules(ruleResponse.data.data);

      setSelectedRuleIds(
        loadedProperty.rules?.map(
          (item) => item.id
        ) || []
      );

      setPricingForm({
        basePrice:
          loadedProperty.basePrice !== null
            ? String(
                loadedProperty.basePrice
              )
            : "",

        weekendPrice:
          loadedProperty.weekendPrice !== null
            ? String(
                loadedProperty.weekendPrice
              )
            : "",

        cleaningFee:
          loadedProperty.cleaningFee !== null
            ? String(
                loadedProperty.cleaningFee
              )
            : "",

        securityDeposit:
          loadedProperty.securityDeposit !==
          null
            ? String(
                loadedProperty.securityDeposit
              )
            : "",

        reservationAmount:
          loadedProperty.reservationAmount !==
          null
            ? String(
                loadedProperty.reservationAmount
              )
            : "",

        checkInTime:
          loadedProperty.checkInTime ||
          "14:00",

        checkOutTime:
          loadedProperty.checkOutTime ||
          "11:00",

        minimumStay: String(
          loadedProperty.minimumStay || 1
        ),

        instantBook:
          loadedProperty.instantBook,
      });

      if (
        loadedProperty.bookingType ===
          "BOTH" ||
        loadedProperty.bookingType ===
          "ROOM_WISE"
      ) {
        const roomResponse =
          await api.get<RoomInventoryResponse>(
            `/vendor/properties/${propertyId}/rooms`
          );

        const loadedRooms =
          roomResponse.data.data || [];

        setRoomTypes(loadedRooms);
      } else {
        setRoomTypes([]);
      }
    } catch (error) {
      setPageError(
        getErrorDetails(error).message
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /*
  |--------------------------------------------------------------------------
  | Pricing Form
  |--------------------------------------------------------------------------
  */

  const updatePricingForm = <
    Field extends keyof PricingFormState,
  >(
    field: Field,
    value: PricingFormState[Field]
  ) => {
    setPricingForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setPricingErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));

    setPageError("");
    setSuccessMessage("");
  };

  const validatePricing = (): boolean => {
    const errors: PricingErrors = {};

    const isRoomWise = property?.bookingType === "ROOM_WISE";

    if (!isRoomWise) {
      if (
        !pricingForm.basePrice ||
        Number(pricingForm.basePrice) <= 0
      ) {
        errors.basePrice =
          "Please enter a base price greater than zero for full property booking.";
      }
    }

    const optionalMoneyFields: Array<
      | "weekendPrice"
      | "cleaningFee"
      | "securityDeposit"
      | "reservationAmount"
    > = [
      "weekendPrice",
      "cleaningFee",
      "securityDeposit",
      "reservationAmount",
    ];

    optionalMoneyFields.forEach((field) => {
      if (
        pricingForm[field] &&
        Number(pricingForm[field]) < 0
      ) {
        errors[field] =
          "Amount cannot be negative.";
      }
    });

    if (
      pricingForm.reservationAmount &&
      pricingForm.basePrice &&
      Number(pricingForm.reservationAmount) > Number(pricingForm.basePrice)
    ) {
      errors.reservationAmount =
        "Deposit amount cannot be greater than base price.";
    }

    if (!pricingForm.checkInTime) {
      errors.checkInTime =
        "Please select check-in time.";
    }

    if (!pricingForm.checkOutTime) {
      errors.checkOutTime =
        "Please select check-out time.";
    }

    const minimumStay = Number(
      pricingForm.minimumStay
    );

    if (
      !Number.isInteger(minimumStay) ||
      minimumStay < 1
    ) {
      errors.minimumStay =
        "Minimum stay must be at least one night.";
    }

    setPricingErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handlePricingSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      submitting ||
      editingBlocked ||
      !validatePricing()
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setPageError("");
      setSuccessMessage("");
      setPricingErrors({});

      const response =
        await api.put<
          ApiResponse<PropertyDetails>
        >(
          `/vendor/properties/${propertyId}/pricing`,
          {
            basePrice:
              pricingForm.basePrice
                ? Number(pricingForm.basePrice)
                : null,

            weekendPrice:
              pricingForm.weekendPrice
                ? Number(
                    pricingForm.weekendPrice
                  )
                : null,

            cleaningFee:
              pricingForm.cleaningFee
                ? Number(
                    pricingForm.cleaningFee
                  )
                : null,

            securityDeposit:
              pricingForm.securityDeposit
                ? Number(
                    pricingForm.securityDeposit
                  )
                : null,

            reservationAmount:
              pricingForm.reservationAmount
                ? Number(
                    pricingForm.reservationAmount
                  )
                : null,

            checkInTime:
              pricingForm.checkInTime,

            checkOutTime:
              pricingForm.checkOutTime,

            minimumStay: Number(
              pricingForm.minimumStay
            ),

            instantBook:
              pricingForm.instantBook,
          }
        );

      setProperty((currentProperty) =>
        currentProperty
          ? {
              ...currentProperty,
              ...response.data.data,
            }
          : currentProperty
      );

      setSuccessMessage(
        property?.bookingType === "ROOM_WISE"
          ? "Stay rules saved successfully."
          : "Pricing saved successfully."
      );

      onChangeStep(5);
    } catch (error) {
      const details =
        getErrorDetails(error);

      setPageError(details.message);

      setPricingErrors(
        details.errors as PricingErrors
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Amenities
  |--------------------------------------------------------------------------
  */

  const toggleAmenity = (
    amenityId: string
  ) => {
    setSelectedAmenityIds(
      (currentIds) =>
        currentIds.includes(amenityId)
          ? currentIds.filter(
              (id) => id !== amenityId
            )
          : [...currentIds, amenityId]
    );

    setPageError("");
    setSuccessMessage("");
  };

  const handleAmenitiesSubmit = async () => {
    if (
      submitting ||
      editingBlocked
    ) {
      return;
    }

    if (
      selectedAmenityIds.length === 0
    ) {
      setPageError(
        "Please select at least one amenity."
      );

      return;
    }

    try {
      setSubmitting(true);
      setPageError("");
      setSuccessMessage("");

      const response =
        await api.put<
          ApiResponse<PropertyDetails>
        >(
          `/vendor/properties/${propertyId}/amenities`,
          {
            amenityIds:
              selectedAmenityIds,
          }
        );

      setProperty((currentProperty) =>
        currentProperty
          ? {
              ...currentProperty,
              amenities:
                response.data.data
                  .amenities,
            }
          : currentProperty
      );

      setSuccessMessage(
        "Amenities saved successfully."
      );

      onChangeStep(6);
    } catch (error) {
      setPageError(
        getErrorDetails(error).message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRule = (ruleId: string) => {
    setSelectedRuleIds((currentIds) =>
      currentIds.includes(ruleId)
        ? currentIds.filter((id) => id !== ruleId)
        : [...currentIds, ruleId]
    );

    setPageError("");
    setSuccessMessage("");
  };

  const handleRulesSubmit = async () => {
    if (submitting || editingBlocked) {
      return;
    }

    try {
      setSubmitting(true);
      setPageError("");
      setSuccessMessage("");

      const response = await api.put<
        ApiResponse<PropertyDetails>
      >(
        `/vendor/properties/${propertyId}/rules`,
        {
          ruleIds: selectedRuleIds,
        }
      );

      setProperty((currentProperty) =>
        currentProperty
          ? {
              ...currentProperty,
              rules:
                response.data.data.rules,
            }
          : currentProperty
      );

      setSuccessMessage(
        "Rules saved successfully."
      );

      onChangeStep(7);
    } catch (error) {
      setPageError(
        getErrorDetails(error).message
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAmenities =
    useMemo(() => {
      const searchText =
        amenitySearch
          .trim()
          .toLowerCase();

      return amenities.filter(
        (amenity) =>
          !searchText ||
          amenity.name
            .toLowerCase()
            .includes(searchText) ||
          amenity.description
            ?.toLowerCase()
            .includes(searchText)
      );
    }, [amenities, amenitySearch]);

  const groupedAmenities =
    useMemo(() => {
      return groupOrder
        .map((group) => ({
          group,
          items:
            filteredAmenities.filter(
              (amenity) =>
                amenity.group === group
            ),
        }))
        .filter(
          (groupData) =>
            groupData.items.length > 0
        );
    }, [filteredAmenities]);

  /*
  |--------------------------------------------------------------------------
  | Review and Submission
  |--------------------------------------------------------------------------
  */

  const reviewChecklist =
    useMemo(() => {
      if (!property) {
        return [];
      }

      const needsFullPropertyPricing =
        property.bookingType !== "ROOM_WISE";

      const needsRoomPricing =
        property.bookingType === "ROOM_WISE" ||
        property.bookingType === "BOTH";

      const hasFullPropertyPricing =
        !needsFullPropertyPricing ||
        Boolean(
          property.basePrice &&
            Number(property.basePrice) > 0
        );

      const hasRoomPricing =
        !needsRoomPricing ||
        roomTypes.some(
          (room) =>
            room.isActive &&
            Number(room.basePrice) > 0
        );

      return [
        {
          step: 1,
          title: "Basic Information",
          complete: Boolean(
            property.title &&
              property.category &&
              property.shortDescription &&
              property.description &&
              property.maxGuests
          ),
        },
        {
          step: 2,
          title: "Location",
          complete: Boolean(
            property.addressLine1 &&
              property.city &&
              property.state &&
              property.country &&
              property.postalCode
          ),
        },
        {
          step: 3,
          title: "Photos",
          complete:
            property.images.length >= 3 &&
            property.images.some(
              (image) => image.isCover
            ),
        },
        {
          step: 4,
          title: "Pricing",
          complete: Boolean(
            hasFullPropertyPricing &&
              hasRoomPricing &&
              property.checkInTime &&
              property.checkOutTime
          ),
        },
        {
          step: 5,
          title: "Amenities",
          complete:
            selectedAmenityIds.length > 0,
        },
        {
          step: 6,
          title: "Rules",
          complete:
            selectedRuleIds.length > 0,
        },
      ];
    }, [
      property,
      roomTypes,
      selectedAmenityIds,
      selectedRuleIds,
    ]);

  const completedSections =
    reviewChecklist.filter(
      (item) => item.complete
    ).length;

  const completionPercentage =
    reviewChecklist.length > 0
      ? Math.round(
          (completedSections /
            reviewChecklist.length) *
            100
        )
      : 0;

  const readyToSubmit =
    reviewChecklist.length > 0 &&
    reviewChecklist.every(
      (item) => item.complete
    );

  const handleSubmitForApproval =
    async () => {
      if (
        submitting ||
        editingBlocked
      ) {
        return;
      }

      if (!readyToSubmit) {
        setPageError(
          "Complete all required property sections before submission."
        );

        return;
      }

      setSubmitConfirmOpen(true);
    };

  const confirmSubmitForApproval =
    async () => {
      if (
        submitting ||
        editingBlocked
      ) {
        return;
      }

      try {
        setSubmitting(true);
        setSubmitConfirmOpen(false);
        setPageError("");
        setSuccessMessage("");
        setMissingSections([]);

        const response =
          await api.post<
            ApiResponse<PropertyDetails>
          >(
            `/vendor/properties/${propertyId}/submit`
          );

        setProperty(response.data.data);

        onStatusChange(
          "PENDING_APPROVAL"
        );

        setSuccessMessage(
          response.data.message
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (error) {
        const details =
          getErrorDetails(error);

        setPageError(details.message);

        setMissingSections(
          details.missingSections
        );
      } finally {
        setSubmitting(false);
      }
    };

  if (loading) {
    return (
      <div className="h-[520px] animate-pulse rounded-dashboard-large bg-surface-soft" />
    );
  }

  if (!property) {
    return (
      <section className="rounded-dashboard-card border border-red-200 bg-red-50 p-5">
        <p className="font-bold text-red-700">
          {pageError ||
            "Unable to load property details."}
        </p>
      </section>
    );
  }

  const roomInventoryIsReady =
    roomTypes.some(
      (room) =>
        room.isActive &&
        Number(room.basePrice) > 0
    );

  const totalRoomUnits =
    roomTypes.reduce(
      (sum, room) =>
        sum + room.totalRooms,
      0
    );

  return (
    <div className="space-y-5">
      {submitConfirmOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/40 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-dashboard-large border border-border bg-surface p-6 text-center shadow-dashboard-lg">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-2xl font-extrabold text-primary-700">
              ?
            </span>

            <h2 className="mt-4 text-xl font-extrabold text-text-main">
              Submit for Admin Approval?
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              Your property will go to admin review. You can still edit it
              while it is pending approval.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSubmitConfirmOpen(false)
                }
                disabled={submitting}
                className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-bold text-text-secondary hover:bg-surface-soft disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmSubmitForApproval()
                }
                disabled={submitting}
                className="h-11 rounded-control bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit"}
              </button>
            </div>
          </section>
        </div>
      )}

      {pageError && (
        <section className="rounded-dashboard-card border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-700">
            {pageError}
          </p>
        </section>
      )}

      {successMessage && (
        <section className="flex items-center gap-3 rounded-dashboard-card border border-primary-200 bg-primary-50 p-4 text-primary-800">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-700 text-white">
            <CheckIcon />
          </span>

          <p className="font-bold">
            {successMessage}
          </p>
        </section>
      )}

      {/* Step 4: Pricing */}

      {activeStep === 4 && (
        <form
          onSubmit={handlePricingSubmit}
          className="space-y-5"
        >
          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Property Pricing
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-text-main">
              Full Stay Rates and Charges
            </h2>

            {property?.bookingType === "ROOM_WISE" ? (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Room-Wise Booking Model
                </p>
                <p className="mt-1 text-sm leading-6">
                  Guests book <strong>individual rooms</strong> for this property. Full-stay property pricing is <strong>not required</strong>. Room rates, weekend rates, and deposit amounts are set per room in{" "}
                  <strong>Room Inventory</strong>.
                </p>
              </div>
            ) : property?.bookingType === "BOTH" ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Both: Full Property and Room-Wise
                </p>
                <p className="mt-1 text-sm leading-6">
                  Guests can book the <strong>entire property</strong> or <strong>individual rooms</strong>. Set full-property rates below, and set room-level rates under <strong>Room Inventory</strong>.
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Entire Property Booking
                </p>
                <p className="mt-1 text-sm leading-6">
                  Guests book the <strong>complete property</strong> privately. Set full-stay night rates, cleaning fee, security deposit, and the online advance booking deposit below.
                </p>
              </div>
            )}

            {property?.bookingType !== "ROOM_WISE" && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {[
                  {
                    field: "basePrice" as const,
                    label: "Full Stay Base Price Per Night",
                    subtext: "Required — base rate guests pay per night when booking the full property.",
                    required: true,
                  },
                  {
                    field: "weekendPrice" as const,
                    label: "Full Stay Weekend Price Per Night",
                    subtext: "Optional — higher rate applied on Friday & Saturday nights.",
                    required: false,
                  },
                  {
                    field: "cleaningFee" as const,
                    label: "Cleaning Fee",
                    subtext: "Optional — one-time cleaning charge added to the booking total.",
                    required: false,
                  },
                  {
                    field: "securityDeposit" as const,
                    label: "Security Deposit (Refundable)",
                    subtext: "Optional — refundable amount held against damage, returned after checkout.",
                    required: false,
                  },
                  {
                    field: "reservationAmount" as const,
                    label: "Advance Booking Deposit (via Razorpay)",
                    subtext: "Optional — minimum advance payment required online to confirm the booking.",
                    required: false,
                  },
                ].map((item) => (
                  <label
                    key={item.field}
                    className="block"
                  >
                    <span className="mb-1 block text-sm font-bold text-text-secondary">
                      {item.label}
                      {item.required && (
                        <span className="text-red-500">
                          {" "}
                          *
                        </span>
                      )}
                    </span>

                    <p className="mb-2 text-xs leading-4 text-text-muted">
                      {item.subtext}
                    </p>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">
                        Rs.
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricingForm[item.field]}
                        disabled={editingBlocked}
                        onChange={(event) =>
                          updatePricingForm(
                            item.field,
                            event.target.value
                          )
                        }
                        placeholder="0.00"
                        className="h-12 w-full rounded-control border border-border bg-surface pl-9 pr-4 text-base text-text-main outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>

                    <FieldError
                      message={pricingErrors[item.field]}
                    />
                  </label>
                ))}
              </div>
            )}
          </section>

          {property &&
            (property.bookingType === "BOTH" ||
              property.bookingType ===
                "ROOM_WISE") && (
              <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
                      Room Inventory
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-text-main">
                      Room Types and Room Prices
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-text-muted">
                      Room type, room quantity, and per-room price are managed
                      only in Manage Rooms.
                    </p>
                  </div>

                  <Link
                    to={`/vendor/properties/${propertyId}/rooms`}
                    className="inline-flex h-10 items-center justify-center rounded-control border border-primary-300 bg-primary-50 px-4 text-sm font-bold text-primary-700 transition hover:bg-primary-100"
                  >
                    Manage Rooms
                  </Link>
                </div>

                {roomTypes.length === 0 ? (
                  <div className="mt-5 rounded-dashboard-card border border-dashed border-primary-300 bg-primary-50 p-5">
                    <h3 className="text-base font-extrabold text-primary-800">
                      No room types added yet
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-primary-700">
                      Add room types like Deluxe, Single, or Suite with their
                      quantity and price before submitting a room-wise property.
                    </p>
                    <Link
                      to={`/vendor/properties/${propertyId}/rooms/new`}
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-control bg-primary-700 px-4 text-sm font-bold text-white transition hover:bg-primary-800"
                    >
                      Add Room Type
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-control bg-surface-soft p-3">
                        <strong className="block text-lg text-text-main">
                          {roomTypes.length}
                        </strong>
                        <span className="text-xs font-bold text-text-muted">
                          Room Types
                        </span>
                      </div>

                      <div className="rounded-control bg-primary-50 p-3">
                        <strong className="block text-lg text-primary-800">
                          {totalRoomUnits}
                        </strong>
                        <span className="text-xs font-bold text-primary-700">
                          Total Rooms
                        </span>
                      </div>

                      <div
                        className={`rounded-control p-3 ${
                          roomInventoryIsReady
                            ? "bg-success-soft"
                            : "bg-danger-soft"
                        }`}
                      >
                        <strong
                          className={`block text-lg ${
                            roomInventoryIsReady
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {roomInventoryIsReady
                            ? "Ready"
                            : "Need Price"}
                        </strong>
                        <span
                          className={`text-xs font-bold ${
                            roomInventoryIsReady
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          Inventory Status
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {roomTypes.map((room) => (
                        <div
                          key={room.id}
                          className="rounded-dashboard-card border border-border bg-surface-soft p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-extrabold text-text-main">
                                {room.name}
                              </h3>
                              <p className="mt-1 text-sm text-text-muted">
                                {room.totalRooms} total rooms
                                {!room.isActive
                                  ? " | inactive"
                                  : ""}
                              </p>
                            </div>

                            <Link
                              to={`/vendor/properties/${propertyId}/rooms/${room.id}/edit`}
                              className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface px-3 text-xs font-bold text-text-secondary hover:bg-surface-soft"
                            >
                              Edit Room
                            </Link>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                            <span className="rounded-full bg-white px-3 py-1 text-text-secondary">
                              Base Rs. {room.basePrice || 0}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-text-secondary">
                              Weekend Rs. {room.weekendPrice || room.basePrice || 0}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-text-secondary">
                              Deposit Rs. {room.reservationAmount || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Stay Rules
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-text-main">
              Check-in and Booking Settings
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Check-in Time *
                </span>

                <input
                  type="time"
                  value={
                    pricingForm.checkInTime
                  }
                  onChange={(event) =>
                    updatePricingForm(
                      "checkInTime",
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-control border border-border bg-surface px-4 text-base"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Check-out Time *
                </span>

                <input
                  type="time"
                  value={
                    pricingForm.checkOutTime
                  }
                  onChange={(event) =>
                    updatePricingForm(
                      "checkOutTime",
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-control border border-border bg-surface px-4 text-base"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Minimum Stay *
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    pricingForm.minimumStay
                  }
                  onChange={(event) =>
                    updatePricingForm(
                      "minimumStay",
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-control border border-border bg-surface px-4 text-base"
                />
              </label>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-soft p-4">
              <input
                type="checkbox"
                checked={
                  pricingForm.instantBook
                }
                onChange={(event) =>
                  updatePricingForm(
                    "instantBook",
                    event.target.checked
                  )
                }
                className="mt-1 h-5 w-5 accent-primary-700"
              />

              <span>
                <strong className="block text-base text-text-main">
                  Enable Instant Booking
                </strong>

                <span className="mt-1 block text-sm text-text-muted">
                  Guests can confirm bookings
                  without waiting for manual
                  vendor approval.
                </span>
              </span>
            </label>
          </section>

          <section className="sticky bottom-4 z-10 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  onChangeStep(3)
                }
                className="h-11 rounded-control border border-border px-5 text-sm font-bold"
              >
                Previous
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  editingBlocked
                }
                className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : "Save & Continue"}
              </button>
            </div>
          </section>
        </form>
      )}

      {/* Step 5: Amenities */}

      {activeStep === 5 && (
        <div className="space-y-5">
          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
                  Property Amenities
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-text-main">
                  Select Available Facilities
                </h2>
              </div>

              <span className="rounded-full bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700">
                {
                  selectedAmenityIds.length
                }{" "}
                Selected
              </span>
            </div>

            <input
              type="search"
              value={amenitySearch}
              onChange={(event) =>
                setAmenitySearch(
                  event.target.value
                )
              }
              placeholder="Search amenities..."
              className="mt-5 h-12 w-full rounded-control border border-border bg-surface px-4 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </section>

          {groupedAmenities.map(
            ({ group, items }) => (
              <section
                key={group}
                className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6"
              >
                <h3 className="text-lg font-extrabold text-text-main">
                  {groupLabels[group]}
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((amenity) => {
                    const selected =
                      selectedAmenityIds.includes(
                        amenity.id
                      );

                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        disabled={
                          editingBlocked
                        }
                        onClick={() =>
                          toggleAmenity(
                            amenity.id
                          )
                        }
                        className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                            : "border-border bg-surface hover:border-primary-300"
                        }`}
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-soft text-primary-700">
                          {amenity.image ? (
                            <img
                              src={getAssetUrl(
                                amenity.image
                              )}
                              alt={
                                amenity.name
                              }
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <CheckIcon />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <strong className="block text-base text-text-main">
                            {amenity.name}
                          </strong>

                          <span className="mt-1 line-clamp-2 block text-sm text-text-muted">
                            {amenity.description ||
                              groupLabels[
                                amenity.group
                              ]}
                          </span>
                        </span>

                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                            selected
                              ? "border-primary-700 bg-primary-700 text-white"
                              : "border-border-strong"
                          }`}
                        >
                          {selected && (
                            <CheckIcon />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )
          )}

          <section className="sticky bottom-4 z-10 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  onChangeStep(4)
                }
                className="h-11 rounded-control border border-border px-5 text-sm font-bold"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleAmenitiesSubmit()
                }
                disabled={
                  submitting ||
                  editingBlocked
                }
                className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : "Save & Continue"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Step 6: Rules */}

      {activeStep === 6 && (
        <div className="space-y-5">
          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Property Rules
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-text-main">
              Select Stay Policies
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Choose the rules that apply to your property. Guests will see these policies before booking.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule) => {
                const selected =
                  selectedRuleIds.includes(
                    rule.id
                  );

                return (
                  <button
                    key={rule.id}
                    type="button"
                    disabled={editingBlocked}
                    onClick={() =>
                      toggleRule(rule.id)
                    }
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                        : "border-border bg-surface hover:border-primary-300"
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary-700">
                      <span className="text-sm font-extrabold">
                        {rule.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join("")}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <strong className="block text-base text-text-main">
                        {rule.name}
                      </strong>

                      {rule.description && (
                        <span className="mt-1 line-clamp-2 block text-sm text-text-muted">
                          {rule.description}
                        </span>
                      )}
                    </span>

                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                        selected
                          ? "border-primary-700 bg-primary-700 text-white"
                          : "border-border-strong"
                      }`}
                    >
                      {selected && (
                        <CheckIcon />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="sticky bottom-4 z-10 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  onChangeStep(5)
                }
                className="h-11 rounded-control border border-border px-5 text-sm font-bold"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleRulesSubmit()
                }
                disabled={
                  submitting ||
                  editingBlocked
                }
                className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : "Save & Continue"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Step 7: Review */}

      {activeStep === 7 && (
        <div className="space-y-5">
          <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Final Review
            </p>

            <h2 className="mt-1 text-2xl font-extrabold text-text-main">
              Review Your Property
            </h2>

            <div className="mt-5">
              <div className="flex justify-between">
                <span className="font-bold text-text-secondary">
                  Listing Completion
                </span>

                <span className="font-extrabold text-primary-700">
                  {completionPercentage}%
                </span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-primary-50">
                <div
                  className="h-full rounded-full bg-primary-700"
                  style={{
                    width: `${completionPercentage}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {reviewChecklist.map(
                (item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() =>
                      onChangeStep(
                        item.step as
                          | 1
                          | 2
                          | 3
                          | 4
                          | 5
                          | 6
                      )
                    }
                    className={`rounded-xl border p-4 text-left ${
                      item.complete
                        ? "border-primary-200 bg-primary-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full ${
                        item.complete
                          ? "bg-primary-700 text-white"
                          : "bg-red-100 font-bold text-red-600"
                      }`}
                    >
                      {item.complete ? (
                        <CheckIcon />
                      ) : (
                        "!"
                      )}
                    </span>

                    <strong className="mt-3 block text-sm text-text-main">
                      {item.title}
                    </strong>

                    <span className="mt-1 block text-xs text-text-muted">
                      {item.complete
                        ? "Complete"
                        : "Needs attention"}
                    </span>
                  </button>
                )
              )}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-dashboard-card border border-border bg-surface p-5">
              <h3 className="text-lg font-extrabold text-text-main">
                Property Summary
              </h3>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">
                    Property
                  </dt>
                  <dd className="font-bold text-text-main">
                    {property.title}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">
                    Category
                  </dt>
                  <dd className="font-bold text-text-main">
                    {
                      property.category
                        .name
                    }
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">
                    Location
                  </dt>
                  <dd className="font-bold text-text-main">
                    {property.city},{" "}
                    {property.state}
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">
                    Photos
                  </dt>
                  <dd className="font-bold text-text-main">
                    {
                      property.images
                        .length
                    }
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">
                    Amenities
                  </dt>
                  <dd className="font-bold text-text-main">
                    {
                      selectedAmenityIds.length
                    }
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-dashboard-card border border-border bg-surface p-5">
              <h3 className="text-lg font-extrabold text-text-main">
                Pricing Summary
              </h3>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">
                    Full Stay Base Price
                  </dt>
                  <dd className="font-bold">
                    {formatPrice(
                      property.basePrice
                    )}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-text-muted">
                    Full Stay Weekend Price
                  </dt>
                  <dd className="font-bold">
                    {formatPrice(
                      property.weekendPrice
                    )}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-text-muted">
                    Check-in
                  </dt>
                  <dd className="font-bold">
                    {property.checkInTime ||
                      "Not added"}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-text-muted">
                    Check-out
                  </dt>
                  <dd className="font-bold">
                    {property.checkOutTime ||
                      "Not added"}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt className="text-text-muted">
                    Minimum Stay
                  </dt>
                  <dd className="font-bold">
                    {
                      property.minimumStay
                    }{" "}
                    Night(s)
                  </dd>
                </div>
              </dl>

              {(property.bookingType ===
                "BOTH" ||
                property.bookingType ===
                  "ROOM_WISE") && (
                <div className="mt-5 rounded-dashboard-card border border-primary-200 bg-primary-50 p-4">
                  <h4 className="text-sm font-extrabold text-primary-800">
                    Room-wise prices
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-primary-700">
                    Add each room type with its own room price before
                    submitting for approval.
                  </p>
                  <Link
                    to={`/vendor/properties/${property.id}/rooms`}
                    className="mt-3 inline-flex h-10 items-center justify-center rounded-control bg-primary-700 px-4 text-sm font-bold text-white transition hover:bg-primary-800"
                  >
                    Manage Room Prices
                  </Link>
                </div>
              )}
            </div>
          </section>

          {missingSections.length > 0 && (
            <section className="rounded-dashboard-card border border-red-200 bg-red-50 p-5">
              <h3 className="font-extrabold text-red-700">
                Complete these sections
              </h3>

              <div className="mt-3 space-y-2">
                {missingSections.map(
                  (section) => (
                    <button
                      key={section.step}
                      type="button"
                      onClick={() =>
                        onChangeStep(
                          section.step as
                            | 1
                            | 2
                            | 3
                            | 4
                            | 5
                        )
                      }
                      className="block w-full rounded-lg bg-white p-3 text-left"
                    >
                      <strong className="block text-red-700">
                        {section.title}
                      </strong>

                      <span className="mt-1 block text-sm text-red-600">
                        {section.message}
                      </span>
                    </button>
                  )
                )}
              </div>
            </section>
          )}

          {property.rejectionReason && (
            <section className="rounded-dashboard-card border border-red-200 bg-red-50 p-5">
              <h3 className="font-extrabold text-red-700">
                Previous Rejection Reason
              </h3>

              <p className="mt-2 text-sm leading-6 text-red-700">
                {
                  property.rejectionReason
                }
              </p>
            </section>
          )}

          <section className="sticky bottom-4 z-10 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">
                After submission, this property will be marked pending
                for admin review. You can still edit it until it is approved.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onChangeStep(6)
                  }
                  className="h-11 rounded-control border border-border px-5 text-sm font-bold"
                >
                  Previous
                </button>

                {property.status ===
                "PENDING_APPROVAL" ? (
                  <Link
                    to="/vendor/properties"
                    className="inline-flex h-11 items-center rounded-control bg-primary-700 px-6 text-sm font-bold text-white"
                  >
                    Back to Properties
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={
                      !readyToSubmit ||
                      submitting ||
                      editingBlocked
                    }
                    onClick={() =>
                      void handleSubmitForApproval()
                    }
                    className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit for Approval"}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

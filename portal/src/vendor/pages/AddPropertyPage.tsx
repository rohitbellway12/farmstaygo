import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
   type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import api from "../../shared/api/api";
import { getAssetUrl } from "../../shared/config/assets";
import PropertyFinalSteps from "../components/PropertyFinalSteps";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

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
  description: string | null;
  image: string | null;
}

interface ServiceCity {
  id: string;
  name: string;
  state: string;
  country: string;
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

interface SelectedPropertyImage {
  key: string;
  file: File;
  previewUrl: string;
}

interface PropertyImagesApiResponse {
  success: boolean;
  message: string;
  data: PropertyImage[];
}

interface PropertyDetails {
  id: string;
  categoryId: string;
  title: string;
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

  images: PropertyImage[];
}

interface CategoryApiResponse {
  success: boolean;
  message: string;
  data: PropertyCategory[];
}

interface ServiceCityApiResponse {
  success: boolean;
  message: string;
  data: ServiceCity[];
}

interface PropertyApiResponse {
  success: boolean;
  message: string;
  data: PropertyDetails;
}

interface PropertyFormState {
  categoryId: string;
  title: string;
  shortDescription: string;
  description: string;
  bookingType: PropertyBookingType | "";
  maxGuests: string;
  bedrooms: string;
  bathrooms: string;
  beds: string;
  totalRooms: string;
}

interface PropertyLocationFormState {
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  locality: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude: string;
  longitude: string;
}

type LocationFormErrors = Partial<
  Record<keyof PropertyLocationFormState, string>
>;

type FormErrors = Partial<
  Record<keyof PropertyFormState, string>
>;



interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string>;
}

/*
|--------------------------------------------------------------------------
| Default Form
|--------------------------------------------------------------------------
*/

const emptyForm: PropertyFormState = {
  categoryId: "",
  title: "",
  shortDescription: "",
  description: "",
  bookingType: "",
  maxGuests: "",
  bedrooms: "",
  bathrooms: "",
  beds: "",
  totalRooms: "",
};

const emptyLocationForm: PropertyLocationFormState = {
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  locality: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  latitude: "",
  longitude: "",
};

interface MapCenter {
  latitude: number;
  longitude: number;
}

interface MapSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LeafletMap {
  setView: (
    coordinates: [number, number],
    zoom?: number
  ) => LeafletMap;
  on: (
    eventName: "click",
    callback: (event: {
      latlng: {
        lat: number;
        lng: number;
      };
    }) => void
  ) => LeafletMap;
  remove: () => void;
  invalidateSize: () => void;
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (
    coordinates: [number, number]
  ) => LeafletMarker;
}

interface LeafletApi {
  map: (
    element: HTMLElement,
    options: {
      center: [number, number];
      zoom: number;
      scrollWheelZoom: boolean;
    }
  ) => LeafletMap;
  tileLayer: (
    url: string,
    options: {
      attribution: string;
      maxZoom: number;
    }
  ) => {
    addTo: (map: LeafletMap) => void;
  };
  marker: (
    coordinates: [number, number]
  ) => LeafletMarker;
}

const defaultMapCenter: MapCenter = {
  latitude: 22.9734,
  longitude: 78.6569,
};

const clamp = (
  value: number,
  min: number,
  max: number
): number => Math.min(Math.max(value, min), max);

const isValidLatitude = (
  value: string
): boolean => {
  const parsed = Number(value);

  return (
    Number.isFinite(parsed) &&
    parsed >= -90 &&
    parsed <= 90
  );
};

const isValidLongitude = (
  value: string
): boolean => {
  const parsed = Number(value);

  return (
    Number.isFinite(parsed) &&
    parsed >= -180 &&
    parsed <= 180
  );
};

/*
|--------------------------------------------------------------------------
| Wizard Steps
|--------------------------------------------------------------------------
*/

const wizardSteps = [
  {
    number: 1,
    title: "Basic Information",
    description: "Property overview",
  },
  {
    number: 2,
    title: "Location",
    description: "Address and map",
  },
  {
    number: 3,
    title: "Photos",
    description: "Cover and gallery",
  },
  {
    number: 4,
    title: "Pricing",
    description: "Rates and availability",
  },
  {
    number: 5,
    title: "Amenities",
    description: "Available facilities",
  },
  {
    number: 6,
    title: "Rules",
    description: "Stay policies",
  },
  {
    number: 7,
    title: "Review",
    description: "Submit for approval",
  },
];

/*
|--------------------------------------------------------------------------
| Booking Type Options
|--------------------------------------------------------------------------
*/

const bookingTypeOptions: Array<{
  value: PropertyBookingType;
  title: string;
  description: string;
}> = [
  {
    value: "ENTIRE_PROPERTY",
    title: "Entire Property",
    description:
      "Guests book the complete property privately.",
  },
  {
    value: "ROOM_WISE",
    title: "Room-wise Booking",
    description:
      "Guests can book individual rooms separately.",
  },
  {
    value: "BOTH",
    title: "Both Booking Types",
    description:
      "Allow complete property and individual room bookings.",
  },
];

/*
|--------------------------------------------------------------------------
| Error Helpers
|--------------------------------------------------------------------------
*/

const getErrorDetails = (
  error: unknown
): {
  message: string;
  errors: Record<string, string>;
} => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return {
      message:
        error.response?.data?.message ||
        "Unable to save property information.",
      errors:
        error.response?.data?.errors || {},
    };
  }

  return {
    message:
      "Unable to save property information. Please try again.",
    errors: {},
  };
};

/*
|--------------------------------------------------------------------------
| Icons
|--------------------------------------------------------------------------
*/

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function PropertyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
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
| Form Field Error
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

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function AddPropertyPage() {
  const navigate = useNavigate();

  const { id: propertyId } = useParams<{
    id: string;
  }>();

  const resolvedPropertyId =
  typeof propertyId === "string"
    ? propertyId.trim()
    : "";

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

 const requestedStep = Number(
  searchParams.get("step")
);

const activeStep:
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6 =
  requestedStep >= 1 &&
  requestedStep <= 6
    ? (requestedStep as
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6)
    : 1;

   const isEditing = Boolean(propertyId);

   const [categories, setCategories] =
    useState<PropertyCategory[]>([]);

  const [serviceCities, setServiceCities] =
    useState<ServiceCity[]>([]);

  const [form, setForm] =
    useState<PropertyFormState>(emptyForm);

    const [locationForm, setLocationForm] =
  useState<PropertyLocationFormState>(
    emptyLocationForm
  );

  const [mapCenter, setMapCenter] =
    useState<MapCenter>(defaultMapCenter);

  const mapContainerRef =
    useRef<HTMLDivElement | null>(null);

  const leafletMapRef =
    useRef<LeafletMap | null>(null);

  const leafletMarkerRef =
    useRef<LeafletMarker | null>(null);

  const [leafletLoaded, setLeafletLoaded] =
    useState(false);

  const [mapSearch, setMapSearch] =
    useState("");

  const [mapSearchResults, setMapSearchResults] =
    useState<MapSearchResult[]>([]);

  const [mapSearching, setMapSearching] =
    useState(false);

  const [mapSearchError, setMapSearchError] =
    useState("");

  const [locationSaved, setLocationSaved] =
  useState(false);

const [propertyImages, setPropertyImages] =
  useState<PropertyImage[]>([]);

const [selectedImages, setSelectedImages] =
  useState<SelectedPropertyImage[]>([]);

const [dragActive, setDragActive] =
  useState(false);

const [uploadingImages, setUploadingImages] =
  useState(false);

const [uploadProgress, setUploadProgress] =
  useState(0);

const [imageActionId, setImageActionId] =
  useState("");

const [
  locationFormErrors,
  setLocationFormErrors,
] = useState<LocationFormErrors>({});

  const [propertyStatus, setPropertyStatus] =
    useState<PropertyStatus>("DRAFT");

    /*
|--------------------------------------------------------------------------
| Property Editing Permission
|--------------------------------------------------------------------------
*/

const editingBlocked = useMemo(() => {
  return (
    propertyStatus === "APPROVED" ||
    propertyStatus === "SUSPENDED"
  );
}, [propertyStatus]);

  const [formErrors, setFormErrors] =
    useState<FormErrors>({});

  const [pageLoading, setPageLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [pageError, setPageError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

    useEffect(() => {
  return () => {
    selectedImages.forEach((image) => {
      URL.revokeObjectURL(
        image.previewUrl
      );
    });
  };
}, [selectedImages]);

  /*
  |--------------------------------------------------------------------------
  | Display Success Message After Draft Creation
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (searchParams.get("created") !== "1") {
      return;
    }

    setSuccessMessage(
      "Property draft created successfully."
    );

    const updatedSearchParams =
      new URLSearchParams(searchParams);

    updatedSearchParams.delete("created");

    setSearchParams(updatedSearchParams, {
      replace: true,
    });
  }, [searchParams, setSearchParams]);

  /*
  |--------------------------------------------------------------------------
  | Load Categories and Existing Property
  |--------------------------------------------------------------------------
  */

  const loadPageData =
    useCallback(async () => {
      try {
        setPageLoading(true);
        setPageError("");

        const [
          categoryResponse,
          cityResponse,
        ] = await Promise.all([
          api.get<CategoryApiResponse>(
            "/vendor/property-categories"
          ),
          api.get<ServiceCityApiResponse>(
            "/vendor/service-cities"
          ),
        ]);

        setCategories(
          categoryResponse.data.data
        );

        setServiceCities(
          cityResponse.data.data
        );

        if (propertyId) {
          const propertyResponse =
            await api.get<PropertyApiResponse>(
              `/vendor/properties/${propertyId}`
            );

          const property =
            propertyResponse.data.data;

          setPropertyStatus(property.status);

          setForm({
            categoryId:
              property.categoryId || "",

            title:
              property.title || "",

            shortDescription:
              property.shortDescription || "",

            description:
              property.description || "",

            bookingType:
              property.bookingType || "",

            maxGuests:
              property.maxGuests !== null
                ? String(property.maxGuests)
                : "",

            bedrooms:
              property.bedrooms !== null
                ? String(property.bedrooms)
                : "",

            bathrooms:
              property.bathrooms !== null
                ? String(property.bathrooms)
                : "",

            beds:
              property.beds !== null
                ? String(property.beds)
                : "",

            totalRooms:
              property.totalRooms !== null
                ? String(property.totalRooms)
                : "",
          });

          setLocationForm({
  addressLine1:
    property.addressLine1 || "",

  addressLine2:
    property.addressLine2 || "",

  landmark:
    property.landmark || "",

  locality:
    property.locality || "",

  city:
    property.city || "",

  state:
    property.state || "",

  country:
    property.country || "India",

  postalCode:
    property.postalCode || "",

  latitude:
    property.latitude !== null
      ? String(property.latitude)
      : "",

  longitude:
    property.longitude !== null
      ? String(property.longitude)
      : "",
});
setPropertyImages(
  property.images || []
);

const propertyLatitude =
  property.latitude !== null
    ? Number(property.latitude)
    : null;

const propertyLongitude =
  property.longitude !== null
    ? Number(property.longitude)
    : null;

if (
  propertyLatitude !== null &&
  propertyLongitude !== null &&
  Number.isFinite(propertyLatitude) &&
  Number.isFinite(propertyLongitude)
) {
  setMapCenter({
    latitude: propertyLatitude,
    longitude: propertyLongitude,
  });
}

setLocationSaved(
  Boolean(
    property.addressLine1 &&
      property.city &&
      property.state &&
      property.country &&
      property.postalCode
  )
);
        }
      } catch (error) {
        const details =
          getErrorDetails(error);

        setPageError(details.message);
      } finally {
        setPageLoading(false);
      }
    }, [propertyId]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);


  /*
|--------------------------------------------------------------------------
| Change Wizard Step
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Change Wizard Step
|--------------------------------------------------------------------------
*/

const changeStep = (
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7
) => {
  if (step === 2 && !propertyId) {
    setPageError(
      "Please create the property draft first."
    );

    return;
  }

  if (
    step === 3 &&
    (!propertyId || !locationSaved)
  ) {
    setPageError(
      "Please save the property location first."
    );

    return;
  }

  if (
    step >= 4 &&
    (!propertyId ||
      propertyImages.length === 0)
  ) {
    setPageError(
      "Please upload at least one property photo first."
    );

    return;
  }

  const updatedParams =
    new URLSearchParams(searchParams);

  updatedParams.set(
    "step",
    String(step)
  );

  updatedParams.delete("created");

  setSearchParams(updatedParams, {
    replace: true,
  });

  setPageError("");
  setSuccessMessage("");
  setFormErrors({});
  setLocationFormErrors({});

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

  /*
  |--------------------------------------------------------------------------
  | Update Form
  |--------------------------------------------------------------------------
  */

  const updateForm = <
    Field extends keyof PropertyFormState,
  >(
    field: Field,
    value: PropertyFormState[Field]
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));

    setSuccessMessage("");
  };

  /*
|--------------------------------------------------------------------------
| Update Location Form
|--------------------------------------------------------------------------
*/

const updateLocationForm = <
  Field extends keyof PropertyLocationFormState,
>(
  field: Field,
  value: PropertyLocationFormState[Field]
) => {
  setLocationForm((currentForm) => {
    if (field !== "city") {
      return {
        ...currentForm,
        [field]: value,
      };
    }

    const selectedCity =
      serviceCities.find(
        (city) => city.name === value
      );

    return {
      ...currentForm,
      city: value,
      state:
        selectedCity?.state ||
        currentForm.state,
      country:
        selectedCity?.country ||
        currentForm.country,
    };
  });

  setLocationFormErrors(
    (currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
      ...(field === "city"
        ? {
            state: undefined,
            country: undefined,
          }
        : {}),
    })
  );

  setSuccessMessage("");
 setLocationSaved(false);
};

const setMapCoordinates = (
  latitude: number,
  longitude: number
) => {
  const nextLatitude = clamp(
    latitude,
    -90,
    90
  );
  const nextLongitude = clamp(
    longitude,
    -180,
    180
  );

  setLocationForm((currentForm) => ({
    ...currentForm,
    latitude: nextLatitude.toFixed(7),
    longitude: nextLongitude.toFixed(7),
  }));

  setLocationFormErrors(
    (currentErrors) => ({
      ...currentErrors,
      latitude: undefined,
      longitude: undefined,
    })
  );

  setMapCenter({
    latitude: nextLatitude,
    longitude: nextLongitude,
  });

  const coordinates: [number, number] = [
    nextLatitude,
    nextLongitude,
  ];

  if (leafletMapRef.current) {
    leafletMapRef.current.setView(
      coordinates,
      16
    );

    if (leafletMarkerRef.current) {
      leafletMarkerRef.current.setLatLng(
        coordinates
      );
    } else {
      const leaflet =
        (window as unknown as {
          L?: LeafletApi;
        }).L;

      if (leaflet) {
        leafletMarkerRef.current =
          leaflet
            .marker(coordinates)
            .addTo(leafletMapRef.current);
      }
    }
  }

  setSuccessMessage("");
  setLocationSaved(false);
};

const syncMapFromTypedCoordinates = () => {
  if (
    !isValidLatitude(locationForm.latitude) ||
    !isValidLongitude(locationForm.longitude)
  ) {
    return;
  }

  setMapCoordinates(
    Number(locationForm.latitude),
    Number(locationForm.longitude)
  );
};

const handleMapSearch = async () => {
  if (editingBlocked) {
    return;
  }

  const queryParts = [
    mapSearch.trim(),
    locationForm.city,
    locationForm.state,
    locationForm.country,
  ].filter(Boolean);

  if (!mapSearch.trim()) {
    setMapSearchError(
      "Please enter a place, road, landmark or area."
    );
    setMapSearchResults([]);
    return;
  }

  try {
    setMapSearching(true);
    setMapSearchError("");
    setMapSearchResults([]);

    const params = new URLSearchParams({
      q: queryParts.join(", "),
      format: "jsonv2",
      limit: "5",
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        "Location search failed."
      );
    }

    const results =
      (await response.json()) as MapSearchResult[];

    if (results.length === 0) {
      setMapSearchError(
        "No matching location found. Try a nearby landmark or area name."
      );
      return;
    }

    setMapSearchResults(results);
  } catch {
    setMapSearchError(
      "Unable to search the map right now."
    );
  } finally {
    setMapSearching(false);
  }
};

const selectMapSearchResult = (
  result: MapSearchResult
) => {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return;
  }

  setMapSearch(result.display_name);
  setMapSearchResults([]);
  setMapSearchError("");
  setMapCoordinates(latitude, longitude);
};

useEffect(() => {
  const existingLeaflet =
    (window as unknown as {
      L?: LeafletApi;
    }).L;

  if (existingLeaflet) {
    setLeafletLoaded(true);
    return;
  }

  const stylesheetId =
    "leaflet-map-styles";
  const scriptId = "leaflet-map-script";

  if (
    !document.getElementById(stylesheetId)
  ) {
    const link =
      document.createElement("link");
    link.id = stylesheetId;
    link.rel = "stylesheet";
    link.href =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  const existingScript =
    document.getElementById(
      scriptId
    ) as HTMLScriptElement | null;

  if (existingScript) {
    existingScript.addEventListener(
      "load",
      () => setLeafletLoaded(true),
      {
        once: true,
      }
    );
    return;
  }

  const script =
    document.createElement("script");
  script.id = scriptId;
  script.src =
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.async = true;
  script.addEventListener(
    "load",
    () => setLeafletLoaded(true),
    {
      once: true,
    }
  );
  document.body.appendChild(script);
}, []);

useEffect(() => {
  if (
    activeStep !== 2 ||
    !leafletLoaded ||
    !mapContainerRef.current ||
    leafletMapRef.current
  ) {
    return;
  }

  const leaflet =
    (window as unknown as {
      L?: LeafletApi;
    }).L;

  if (!leaflet) {
    return;
  }

  const initialCenter: [number, number] = [
    isValidLatitude(locationForm.latitude)
      ? Number(locationForm.latitude)
      : mapCenter.latitude,
    isValidLongitude(locationForm.longitude)
      ? Number(locationForm.longitude)
      : mapCenter.longitude,
  ];

  const map = leaflet.map(
    mapContainerRef.current,
    {
      center: initialCenter,
      zoom: 13,
      scrollWheelZoom: true,
    }
  );

  leaflet
    .tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }
    )
    .addTo(map);

  leafletMapRef.current = map;

  if (
    isValidLatitude(locationForm.latitude) &&
    isValidLongitude(locationForm.longitude)
  ) {
    leafletMarkerRef.current = leaflet
      .marker(initialCenter)
      .addTo(map);
  }

  map.on("click", (event) => {
    if (editingBlocked) {
      return;
    }

    setMapCoordinates(
      event.latlng.lat,
      event.latlng.lng
    );
  });

  window.setTimeout(() => {
    map.invalidateSize();
  }, 100);
}, [
  activeStep,
  editingBlocked,
  leafletLoaded,
  locationForm.latitude,
  locationForm.longitude,
  mapCenter.latitude,
  mapCenter.longitude,
]);

  /*
  |--------------------------------------------------------------------------
  | Frontend Validation
  |--------------------------------------------------------------------------
  */

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!form.categoryId) {
      errors.categoryId =
        "Please select a property category.";
    }

    if (form.title.trim().length < 3) {
      errors.title =
        "Property title must contain at least 3 characters.";
    }

    if (!form.bookingType) {
      errors.bookingType =
        "Please select a booking type.";
    }

    const numericFields: Array<{
      field:
        | "maxGuests"
        | "bedrooms"
        | "bathrooms"
        | "beds"
        | "totalRooms";
      label: string;
      minimum: number;
    }> = [
      {
        field: "maxGuests",
        label: "Maximum guests",
        minimum: 1,
      },
      {
        field: "bedrooms",
        label: "Bedrooms",
        minimum: 0,
      },
      {
        field: "bathrooms",
        label: "Bathrooms",
        minimum: 0,
      },
      {
        field: "beds",
        label: "Beds",
        minimum: 0,
      },
      {
        field: "totalRooms",
        label: "Total rooms",
        minimum: 0,
      },
    ];

    numericFields.forEach(
      ({ field, label, minimum }) => {
        const value = form[field];

        if (!value) {
          return;
        }

        const parsedValue = Number(value);

        if (
          !Number.isInteger(parsedValue) ||
          parsedValue < minimum
        ) {
          errors[field] =
            `${label} must be a whole number of ${minimum} or greater.`;
        }
      }
    );

    if (!form.maxGuests) {
      errors.maxGuests =
        "Please enter the maximum guest capacity.";
    }

    if (
      form.shortDescription.trim().length >
      180
    ) {
      errors.shortDescription =
        "Short description cannot exceed 180 characters.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /*
|--------------------------------------------------------------------------
| Validate Location Form
|--------------------------------------------------------------------------
*/

const validateLocationForm = (): boolean => {
  const errors: LocationFormErrors = {};

  if (
    locationForm.addressLine1.trim().length <
    3
  ) {
    errors.addressLine1 =
      "Please enter the complete property address.";
  }

  const selectedServiceCity =
    serviceCities.find(
      (city) =>
        city.name === locationForm.city &&
        city.state === locationForm.state &&
        city.country === locationForm.country
    );

  if (!selectedServiceCity) {
    errors.city =
      "Please select a city enabled by admin.";
  }

  if (locationForm.state.trim().length < 2) {
    errors.state =
      "Please enter a valid state.";
  }

  if (
    locationForm.country.trim().length < 2
  ) {
    errors.country =
      "Please enter a valid country.";
  }

  if (
    locationForm.postalCode.trim().length < 3
  ) {
    errors.postalCode =
      "Please enter a valid postal code.";
  }

  if (locationForm.latitude.trim()) {
    const latitude = Number(
      locationForm.latitude
    );

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      errors.latitude =
        "Latitude must be between -90 and 90.";
    }
  }

  if (locationForm.longitude.trim()) {
    const longitude = Number(
      locationForm.longitude
    );

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      errors.longitude =
        "Longitude must be between -180 and 180.";
    }
  }

  setLocationFormErrors(errors);

  return Object.keys(errors).length === 0;
};

  /*
  |--------------------------------------------------------------------------
  | Save Property Draft
  |--------------------------------------------------------------------------
  */

 const handleBasicSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      submitting ||
      editingBlocked ||
      !validateForm()
    ) {
      return;
    }

    try {
      setSubmitting(true);
      setPageError("");
      setSuccessMessage("");
      setFormErrors({});

      const payload = {
        categoryId: form.categoryId,

        title: form.title.trim(),

        shortDescription:
          form.shortDescription.trim(),

        description:
          form.description.trim(),

        bookingType:
          form.bookingType,

        maxGuests: form.maxGuests
          ? Number(form.maxGuests)
          : null,

        bedrooms: form.bedrooms
          ? Number(form.bedrooms)
          : null,

        bathrooms: form.bathrooms
          ? Number(form.bathrooms)
          : null,

        beds: form.beds
          ? Number(form.beds)
          : null,

        totalRooms: form.totalRooms
          ? Number(form.totalRooms)
          : null,
      };

     if (propertyId) {
  await api.put(
    `/vendor/properties/${propertyId}/basic-info`,
    payload
  );

  changeStep(2);

  setSuccessMessage(
    "Basic information saved. Now add the property location."
  );
} else {
  const response =
    await api.post<PropertyApiResponse>(
      "/vendor/properties/draft",
      payload
    );

  const createdPropertyId =
    response.data.data.id;

  navigate(
    `/vendor/properties/${createdPropertyId}/edit?step=2&created=1`,
    {
      replace: true,
    }
  );
}
    } catch (error) {
      const details =
        getErrorDetails(error);

      setPageError(details.message);

      setFormErrors(
        details.errors as FormErrors
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /*
|--------------------------------------------------------------------------
| Save Property Location
|--------------------------------------------------------------------------
*/

const handleLocationSubmit = async (
  event: FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  if (
    !propertyId ||
    submitting ||
    editingBlocked ||
    !validateLocationForm()
  ) {
    return;
  }

  try {
    setSubmitting(true);
    setPageError("");
    setSuccessMessage("");
    setLocationFormErrors({});

    const payload = {
      addressLine1:
        locationForm.addressLine1.trim(),

      addressLine2:
        locationForm.addressLine2.trim(),

      landmark:
        locationForm.landmark.trim(),

      locality:
        locationForm.locality.trim(),

      city:
        locationForm.city.trim(),

      state:
        locationForm.state.trim(),

      country:
        locationForm.country.trim(),

      postalCode:
        locationForm.postalCode.trim(),

      latitude:
        locationForm.latitude.trim()
          ? Number(locationForm.latitude)
          : null,

      longitude:
        locationForm.longitude.trim()
          ? Number(locationForm.longitude)
          : null,
    };

    await api.put(
      `/vendor/properties/${propertyId}/location`,
      payload
    );

   setLocationSaved(true);

setSuccessMessage(
  "Property location saved. Now add property photos."
);

const updatedParams =
  new URLSearchParams(searchParams);

updatedParams.set("step", "3");
updatedParams.delete("created");

setSearchParams(updatedParams, {
  replace: true,
});

window.scrollTo({
  top: 0,
  behavior: "smooth",
});
  } catch (error) {
    const details =
      getErrorDetails(error);

    setPageError(details.message);

    setLocationFormErrors(
      details.errors as LocationFormErrors
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  } finally {
    setSubmitting(false);
  }
};

/*
|--------------------------------------------------------------------------
| Clear Selected Property Images
|--------------------------------------------------------------------------
*/

const clearSelectedImages = () => {
  selectedImages.forEach((image) => {
    URL.revokeObjectURL(
      image.previewUrl
    );
  });

  setSelectedImages([]);
  setUploadProgress(0);
};

/*
|--------------------------------------------------------------------------
| Validate and Prepare Property Images
|--------------------------------------------------------------------------
*/

const preparePropertyImages = (
  files: File[]
) => {
  if (files.length === 0) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const invalidTypeFile = files.find(
    (file) =>
      !allowedTypes.includes(file.type)
  );

  if (invalidTypeFile) {
    setPageError(
      "Only JPG, JPEG, PNG and WEBP property images are allowed."
    );

    return;
  }

  const oversizedFile = files.find(
    (file) =>
      file.size > 8 * 1024 * 1024
  );

  if (oversizedFile) {
    setPageError(
      `${oversizedFile.name} is larger than 8 MB.`
    );

    return;
  }

  const availableImageSlots =
    20 - propertyImages.length;

  if (availableImageSlots <= 0) {
    setPageError(
      "This property already has the maximum 20 images."
    );

    return;
  }

  if (files.length > 10) {
    setPageError(
      "You can upload a maximum of 10 images in one request."
    );

    return;
  }

  if (files.length > availableImageSlots) {
    setPageError(
      `You can add only ${availableImageSlots} more image${
        availableImageSlots === 1 ? "" : "s"
      }.`
    );

    return;
  }

  clearSelectedImages();

  const preparedImages =
    files.map((file, index) => ({
      key: [
        file.name,
        file.size,
        file.lastModified,
        index,
      ].join("-"),

      file,

      previewUrl:
        URL.createObjectURL(file),
    }));

  setSelectedImages(preparedImages);
  setPageError("");
  setSuccessMessage("");
};

/*
|--------------------------------------------------------------------------
| Handle File Input
|--------------------------------------------------------------------------
*/

const handlePropertyImageChange = (
  event: ChangeEvent<HTMLInputElement>
) => {
  const files = Array.from(
    event.target.files || []
  );

  preparePropertyImages(files);

  event.target.value = "";
};

/*
|--------------------------------------------------------------------------
| Handle Image Drop
|--------------------------------------------------------------------------
*/

const handlePropertyImageDrop = (
  event: DragEvent<HTMLDivElement>
) => {
  event.preventDefault();

  setDragActive(false);

  const files = Array.from(
    event.dataTransfer.files || []
  );

  preparePropertyImages(files);
};

/*
|--------------------------------------------------------------------------
| Remove Selected Preview
|--------------------------------------------------------------------------
*/

const removeSelectedPropertyImage = (
  imageKey: string
) => {
  setSelectedImages((currentImages) => {
    const removedImage =
      currentImages.find(
        (image) =>
          image.key === imageKey
      );

    if (removedImage) {
      URL.revokeObjectURL(
        removedImage.previewUrl
      );
    }

    return currentImages.filter(
      (image) =>
        image.key !== imageKey
    );
  });
};

/*
|--------------------------------------------------------------------------
| Upload Property Images
|--------------------------------------------------------------------------
*/

const handleUploadPropertyImages =
  async () => {
    if (
      !propertyId ||
      selectedImages.length === 0 ||
      uploadingImages
    ) {
      return;
    }

    try {
      setUploadingImages(true);
      setUploadProgress(0);
      setPageError("");
      setSuccessMessage("");

      const formData = new FormData();

      selectedImages.forEach((image) => {
        formData.append(
          "images",
          image.file
        );
      });

      const response =
        await api.post<PropertyImagesApiResponse>(
          `/vendor/properties/${propertyId}/images`,
          formData,
          {
            onUploadProgress: (
              progressEvent
            ) => {
              if (!progressEvent.total) {
                return;
              }

              const percentage =
                Math.round(
                  (progressEvent.loaded * 100) /
                    progressEvent.total
                );

              setUploadProgress(
                percentage
              );
            },
          }
        );

      setPropertyImages(
        [...response.data.data].sort(
          (firstImage, secondImage) =>
            firstImage.sortOrder -
            secondImage.sortOrder
        )
      );

      clearSelectedImages();

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
    } finally {
      setUploadingImages(false);
    }
  };

/*
|--------------------------------------------------------------------------
| Set Property Cover Image
|--------------------------------------------------------------------------
*/

const handleSetCoverImage = async (
  imageId: string
) => {
  if (
    !propertyId ||
    imageActionId
  ) {
    return;
  }

  try {
    setImageActionId(imageId);
    setPageError("");
    setSuccessMessage("");

    await api.patch(
      `/vendor/properties/${propertyId}/images/${imageId}/cover`
    );

    setPropertyImages(
      (currentImages) =>
        currentImages.map((image) => ({
          ...image,
          isCover:
            image.id === imageId,
        }))
    );

    setSuccessMessage(
      "Cover image updated successfully."
    );
  } catch (error) {
    const details =
      getErrorDetails(error);

    setPageError(details.message);
  } finally {
    setImageActionId("");
  }
};

/*
|--------------------------------------------------------------------------
| Delete Property Image
|--------------------------------------------------------------------------
*/

const handleDeletePropertyImage =
  async (imageId: string) => {
    if (
      !propertyId ||
      imageActionId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this property image?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setImageActionId(imageId);
      setPageError("");
      setSuccessMessage("");

      const response =
        await api.delete<PropertyImagesApiResponse>(
          `/vendor/properties/${propertyId}/images/${imageId}`
        );

      setPropertyImages(
        [...response.data.data].sort(
          (firstImage, secondImage) =>
            firstImage.sortOrder -
            secondImage.sortOrder
        )
      );

      setSuccessMessage(
        "Property image deleted successfully."
      );
    } catch (error) {
      const details =
        getErrorDetails(error);

      setPageError(details.message);
    } finally {
      setImageActionId("");
    }
  };

/*
|--------------------------------------------------------------------------
| Reorder Property Image
|--------------------------------------------------------------------------
*/

const handleMovePropertyImage =
  async (
    imageId: string,
    direction: "previous" | "next"
  ) => {
    if (
      !propertyId ||
      imageActionId
    ) {
      return;
    }

    const currentIndex =
      propertyImages.findIndex(
        (image) =>
          image.id === imageId
      );

    const targetIndex =
      direction === "previous"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >=
        propertyImages.length
    ) {
      return;
    }

    const reorderedImages = [
      ...propertyImages,
    ];

    const [movedImage] =
      reorderedImages.splice(
        currentIndex,
        1
      );

    reorderedImages.splice(
      targetIndex,
      0,
      movedImage
    );

    try {
      setImageActionId(imageId);
      setPageError("");
      setSuccessMessage("");

      const response =
        await api.put<PropertyImagesApiResponse>(
          `/vendor/properties/${propertyId}/images/reorder`,
          {
            imageIds:
              reorderedImages.map(
                (image) => image.id
              ),
          }
        );

      setPropertyImages(
        [...response.data.data].sort(
          (firstImage, secondImage) =>
            firstImage.sortOrder -
            secondImage.sortOrder
        )
      );

      setSuccessMessage(
        "Property image order updated successfully."
      );
    } catch (error) {
      const details =
        getErrorDetails(error);

      setPageError(details.message);
    } finally {
      setImageActionId("");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Loading State
  |--------------------------------------------------------------------------
  */

  if (pageLoading) {
    return (
      <div className="space-y-5">
        <div className="h-32 animate-pulse rounded-dashboard-large bg-surface-soft" />

        <div className="h-24 animate-pulse rounded-dashboard-card bg-surface-soft" />

        <div className="h-[520px] animate-pulse rounded-dashboard-large bg-surface-soft" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}

      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-700">
              <PropertyIcon />
            </span>

            <div>
              <Link
                to="/vendor/properties"
                className="inline-flex items-center gap-1 text-sm font-bold text-primary-700 transition hover:text-primary-800"
              >
                <ArrowLeftIcon />
                Back to Properties
              </Link>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-text-main sm:text-3xl">
                {isEditing
                  ? "Edit Property"
                  : "Add New Property"}
              </h1>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                Complete each section to prepare your
                property for approval.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing && (
              <span className="rounded-full border border-border bg-surface-soft px-4 py-2 text-sm font-bold text-text-secondary">
                Status:{" "}
                {propertyStatus.replaceAll(
                  "_",
                  " "
                )}
              </span>
            )}

            <span className="rounded-full bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700">
  Step {activeStep} of 6
</span>
          </div>
        </div>
      </section>

      {/* Wizard Steps */}

      <section className="overflow-x-auto rounded-dashboard-card border border-border bg-surface p-4 shadow-dashboard">
        <div className="grid min-w-[900px] grid-cols-6 gap-3">
         {wizardSteps.map((step) => {
  /*
  |--------------------------------------------------------------------------
  | Wizard Step State
  |--------------------------------------------------------------------------
  */

  const isActive =
    step.number === activeStep;

  const isCompleted =
    step.number < activeStep;

  const isAvailable =
  step.number === 1 ||
  (step.number === 2 &&
    Boolean(propertyId)) ||
  (step.number === 3 &&
    Boolean(propertyId) &&
    locationSaved) ||
  (step.number >= 4 &&
    Boolean(propertyId) &&
    propertyImages.length > 0);

  return (
    <button
      key={step.number}
      type="button"
      disabled={!isAvailable}
      onClick={() => {
       if (
  step.number >= 1 &&
  step.number <= 6
) {
  changeStep(
    step.number as
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6
  );
}
      }}
      className={`rounded-xl border p-3 text-left transition ${
        isActive
          ? "border-primary-300 bg-primary-50"
          : isCompleted
            ? "border-primary-200 bg-primary-50/50"
            : "border-border bg-surface-soft"
      } ${
        isAvailable
          ? "cursor-pointer hover:border-primary-300 hover:bg-primary-50/60"
          : "cursor-not-allowed opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
            isActive
              ? "bg-primary-700 text-white"
              : isCompleted
                ? "bg-primary-100 text-primary-700"
                : "bg-surface text-text-muted"
          }`}
        >
          {isCompleted ? (
            <CheckIcon />
          ) : (
            step.number
          )}
        </span>

        <div className="min-w-0">
          <p
            className={`truncate text-sm font-extrabold ${
              isActive
                ? "text-primary-800"
                : isCompleted
                  ? "text-primary-700"
                  : "text-text-secondary"
            }`}
          >
            {step.title}
          </p>

          <p className="mt-0.5 truncate text-xs text-text-muted">
            {step.description}
          </p>
        </div>
      </div>
    </button>
  );
})}
        </div>
      </section>

      {/* Messages */}

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

      {editingBlocked && (
        <section className="rounded-dashboard-card border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-800">
            This property cannot be edited while its
            status is {propertyStatus.toLowerCase()}.
          </p>
        </section>
      )}

      {/* Basic Information Form */}

     {activeStep === 1 && (
  <form
    onSubmit={handleBasicSubmit}
    className="space-y-5"
  >
        {/* Property Category */}

        <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Property Type
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-text-main">
              Select Property Category
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Choose the category that best describes
              your property.
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const selected =
                  form.categoryId ===
                  category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    disabled={editingBlocked}
                    onClick={() =>
                      updateForm(
                        "categoryId",
                        category.id
                      )
                    }
                    className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                        : "border-border bg-surface hover:border-primary-300 hover:bg-primary-50/40"
                    }`}
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-soft text-primary-700">
                      {category.image ? (
                        <img
                          src={getAssetUrl(
                            category.image
                          )}
                          alt={category.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImagePlaceholderIcon />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <strong className="block text-base font-extrabold text-text-main">
                        {category.name}
                      </strong>

                      <span className="mt-1 line-clamp-2 block text-sm leading-5 text-text-muted">
                        {category.description ||
                          "Property category"}
                      </span>
                    </span>

                    {selected && (
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-700 text-white">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border-strong bg-surface-soft p-6 text-center">
              <p className="font-bold text-text-secondary">
                No active property categories are
                available.
              </p>
            </div>
          )}

          <FieldError
            message={formErrors.categoryId}
          />
        </section>

        {/* Property Description */}

        <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Property Overview
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-text-main">
              Basic Property Details
            </h2>
          </div>

          <div className="mt-5 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Property Title
                <span className="text-red-500">
                  {" "}
                  *
                </span>
              </span>

              <input
                type="text"
                value={form.title}
                disabled={editingBlocked}
                onChange={(event) =>
                  updateForm(
                    "title",
                    event.target.value
                  )
                }
                placeholder="Example: Green Valley Farmhouse"
                className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
                  formErrors.title
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : "border-border focus:border-primary-500 focus:ring-primary-100"
                }`}
              />

              <FieldError
                message={formErrors.title}
              />
            </label>

            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-text-secondary">
                  Short Description
                </span>

                <span className="text-sm text-text-muted">
                  {
                    form.shortDescription
                      .length
                  }
                  /180
                </span>
              </div>

              <textarea
                rows={3}
                maxLength={180}
                value={form.shortDescription}
                disabled={editingBlocked}
                onChange={(event) =>
                  updateForm(
                    "shortDescription",
                    event.target.value
                  )
                }
                placeholder="Write a short summary that will appear on property cards."
                className={`w-full resize-none rounded-control border bg-surface px-4 py-3 text-base leading-6 text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
                  formErrors.shortDescription
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : "border-border focus:border-primary-500 focus:ring-primary-100"
                }`}
              />

              <FieldError
                message={
                  formErrors.shortDescription
                }
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Full Description
              </span>

              <textarea
                rows={6}
                value={form.description}
                disabled={editingBlocked}
                onChange={(event) =>
                  updateForm(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Describe the property, surroundings, suitable guests and special features."
                className="w-full resize-y rounded-control border border-border bg-surface px-4 py-3 text-base leading-7 text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </label>
          </div>
        </section>

        {/* Booking Type */}

        <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Booking Model
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-text-main">
              How can guests book this property?
            </h2>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {bookingTypeOptions.map(
              (option) => {
                const selected =
                  form.bookingType ===
                  option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={editingBlocked}
                    onClick={() =>
                      updateForm(
                        "bookingType",
                        option.value
                      )
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-primary-500 bg-primary-50 ring-2 ring-primary-100"
                        : "border-border bg-surface hover:border-primary-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="text-base font-extrabold text-text-main">
                        {option.title}
                      </strong>

                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                          selected
                            ? "border-primary-700 bg-primary-700 text-white"
                            : "border-border-strong bg-surface"
                        }`}
                      >
                        {selected && (
                          <CheckIcon />
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      {option.description}
                    </p>
                  </button>
                );
              }
            )}
          </div>

          <FieldError
            message={formErrors.bookingType}
          />

          {form.bookingType && (
            <div className={`mt-4 rounded-dashboard-card border p-4 ${
              form.bookingType === "ENTIRE_PROPERTY"
                ? "border-emerald-200 bg-emerald-50"
                : form.bookingType === "ROOM_WISE"
                ? "border-blue-200 bg-blue-50"
                : "border-amber-200 bg-amber-50"
            }`}>
              <h3 className={`text-sm font-extrabold ${
                form.bookingType === "ENTIRE_PROPERTY"
                  ? "text-emerald-800"
                  : form.bookingType === "ROOM_WISE"
                  ? "text-blue-800"
                  : "text-amber-800"
              }`}>
                {form.bookingType === "ENTIRE_PROPERTY"
                  ? "🏡 Entire Property — Set pricing in Step 4"
                  : form.bookingType === "ROOM_WISE"
                  ? "🛏️ Room-Wise — Pricing set per room in Room Inventory"
                  : "📦 Both — Step 4 for full-stay + Room Inventory for rooms"}
              </h3>
              <p className={`mt-1 text-sm leading-6 ${
                form.bookingType === "ENTIRE_PROPERTY"
                  ? "text-emerald-700"
                  : form.bookingType === "ROOM_WISE"
                  ? "text-blue-700"
                  : "text-amber-700"
              }`}>
                {form.bookingType === "ENTIRE_PROPERTY"
                  ? "Set base night rate, weekend rate, cleaning fee, security deposit, and Razorpay advance deposit in Step 4 — Pricing."
                  : form.bookingType === "ROOM_WISE"
                  ? "No full-property pricing needed here. After saving this draft, go to Room Inventory to add room types with their own base rate, weekend rate, and deposit amounts."
                  : "Set the full-property pricing in Step 4, then add individual room-type pricing from Room Inventory after the property draft is created."}
              </p>
            </div>
          )}

        </section>

        {/* Capacity */}

        <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
              Capacity
            </p>

            <h2 className="mt-1 text-xl font-extrabold text-text-main">
              Property Capacity Details
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Add accurate capacity information for
              guests and rooms.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                field: "maxGuests" as const,
                label: "Maximum Guests",
                placeholder: "12",
                required: true,
              },
              {
                field: "bedrooms" as const,
                label: "Bedrooms",
                placeholder: "4",
                required: false,
              },
              {
                field: "bathrooms" as const,
                label: "Bathrooms",
                placeholder: "4",
                required: false,
              },
              {
                field: "beds" as const,
                label: "Beds",
                placeholder: "6",
                required: false,
              },
              {
                field: "totalRooms" as const,
                label: "Total Rooms",
                placeholder: "4",
                required: false,
              },
            ].map((item) => (
              <label
                key={item.field}
                className="block"
              >
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  {item.label}

                  {item.required && (
                    <span className="text-red-500">
                      {" "}
                      *
                    </span>
                  )}
                </span>

                <input
                  type="number"
                  min={
                    item.field ===
                    "maxGuests"
                      ? 1
                      : 0
                  }
                  step="1"
                  value={form[item.field]}
                  disabled={editingBlocked}
                  onChange={(event) =>
                    updateForm(
                      item.field,
                      event.target.value
                    )
                  }
                  placeholder={item.placeholder}
                  className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
                    formErrors[item.field]
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-border focus:border-primary-500 focus:ring-primary-100"
                  }`}
                />

                <FieldError
                  message={
                    formErrors[item.field]
                  }
                />
              </label>
            ))}
          </div>
        </section>

        {/* Form Footer */}

        <section className="sticky bottom-4 z-10 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-text-muted">
              Your property will remain in Draft
              status until all sections are completed
              and submitted.
            </p>

            <div className="flex gap-3">
              <Link
                to="/vendor/properties"
                className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-soft"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  submitting ||
                  editingBlocked ||
                  categories.length === 0
                }
                className="inline-flex h-11 min-w-44 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
  ? "Saving..."
  : "Save & Continue"}
              </button>
            </div>
          </div>
        </section>
      </form>
      )}

      {/* Location Step */}

{activeStep === 2 && (
  <form
    onSubmit={handleLocationSubmit}
    className="space-y-5"
  >
    {/* City and Region */}

    <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
          Region Details
        </p>

        <h2 className="mt-1 text-xl font-extrabold text-text-main">
          City, State and Postal Code
        </h2>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            City
            <span className="text-red-500">
              {" "}
              *
            </span>
          </span>

          <select
            value={locationForm.city}
            disabled={
              editingBlocked ||
              serviceCities.length === 0
            }
            onChange={(event) =>
              updateLocationForm(
                "city",
                event.target.value
              )
            }
            className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
              locationFormErrors.city
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-border focus:border-primary-500 focus:ring-primary-100"
            }`}
          >
            <option value="">
              {serviceCities.length === 0
                ? "No active cities available"
                : "Select city"}
            </option>

            {serviceCities.map((city) => (
              <option
                key={city.id}
                value={city.name}
              >
                {city.name}, {city.state}
              </option>
            ))}
          </select>

          <FieldError
            message={locationFormErrors.city}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            State
            <span className="text-red-500">
              {" "}
              *
            </span>
          </span>

          <input
            type="text"
            value={locationForm.state}
            disabled
            onChange={(event) =>
              updateLocationForm(
                "state",
                event.target.value
              )
            }
            placeholder="Example: Madhya Pradesh"
            className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
              locationFormErrors.state
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-border focus:border-primary-500 focus:ring-primary-100"
            }`}
          />

          <FieldError
            message={locationFormErrors.state}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            Country
            <span className="text-red-500">
              {" "}
              *
            </span>
          </span>

          <input
            type="text"
            value={locationForm.country}
            disabled
            onChange={(event) =>
              updateLocationForm(
                "country",
                event.target.value
              )
            }
            placeholder="India"
            className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
              locationFormErrors.country
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-border focus:border-primary-500 focus:ring-primary-100"
            }`}
          />

          <FieldError
            message={
              locationFormErrors.country
            }
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            Postal Code
            <span className="text-red-500">
              {" "}
              *
            </span>
          </span>

          <input
            type="text"
            inputMode="numeric"
            value={locationForm.postalCode}
            disabled={editingBlocked}
            onChange={(event) =>
              updateLocationForm(
                "postalCode",
                event.target.value
              )
            }
            placeholder="Example: 487001"
            className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
              locationFormErrors.postalCode
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-border focus:border-primary-500 focus:ring-primary-100"
            }`}
          />

          <FieldError
            message={
              locationFormErrors.postalCode
            }
          />
        </label>
      </div>
    </section>

    {/* Address Details */}

    <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
          Property Location
        </p>

        <h2 className="mt-1 text-xl font-extrabold text-text-main">
          Property Address
        </h2>

        <p className="mt-1 text-sm leading-6 text-text-muted">
          Enter the complete address where guests
          will stay.
        </p>
      </div>

      <div className="mt-5 grid gap-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            Address Line 1
            <span className="text-red-500">
              {" "}
              *
            </span>
          </span>

          <input
            type="text"
            value={locationForm.addressLine1}
            disabled={editingBlocked}
            onChange={(event) =>
              updateLocationForm(
                "addressLine1",
                event.target.value
              )
            }
            placeholder="House number, property name, street or road"
            className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
              locationFormErrors.addressLine1
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-border focus:border-primary-500 focus:ring-primary-100"
            }`}
          />

          <FieldError
            message={
              locationFormErrors.addressLine1
            }
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            Address Line 2
          </span>

          <input
            type="text"
            value={locationForm.addressLine2}
            disabled={editingBlocked}
            onChange={(event) =>
              updateLocationForm(
                "addressLine2",
                event.target.value
              )
            }
            placeholder="Apartment, floor, building or nearby area"
            className="h-12 w-full rounded-control border border-border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-text-secondary">
              Landmark
            </span>

            <input
              type="text"
              value={locationForm.landmark}
              disabled={editingBlocked}
              onChange={(event) =>
                updateLocationForm(
                  "landmark",
                  event.target.value
                )
              }
              placeholder="Example: Near River Bridge"
              className="h-12 w-full rounded-control border border-border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-text-secondary">
              Locality / Area
            </span>

            <input
              type="text"
              value={locationForm.locality}
              disabled={editingBlocked}
              onChange={(event) =>
                updateLocationForm(
                  "locality",
                  event.target.value
                )
              }
              placeholder="Village, colony or locality"
              className="h-12 w-full rounded-control border border-border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>
        </div>
      </div>
    </section>

    {/* Map Coordinates */}

    <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
          Map Position
        </p>

        <h2 className="mt-1 text-xl font-extrabold text-text-main">
          Latitude and Longitude
        </h2>

        <p className="mt-1 text-sm leading-6 text-text-muted">
          Click on the map to select the exact
          property position. Latitude and longitude
          will be filled automatically.
        </p>
      </div>

      <div
        className="relative mt-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="block min-w-0 flex-1">
            <span className="mb-2 block text-sm font-bold text-text-secondary">
              Search on Map
            </span>

            <input
              type="search"
              value={mapSearch}
              disabled={editingBlocked}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleMapSearch();
                }
              }}
              onChange={(event) => {
                setMapSearch(
                  event.target.value
                );
                setMapSearchError("");
              }}
              placeholder="Search landmark, road, farm name or area"
              className="h-12 w-full rounded-control border border-border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleMapSearch()}
            disabled={
              editingBlocked ||
              mapSearching
            }
            className="mt-auto inline-flex h-12 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mapSearching
              ? "Searching..."
              : "Search"}
          </button>
        </div>

        {mapSearchError && (
          <p className="mt-2 text-sm font-semibold text-red-600">
            {mapSearchError}
          </p>
        )}

        {mapSearchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-[84px] z-40 overflow-hidden rounded-dashboard-card border border-border bg-white shadow-dashboard-lg">
            {mapSearchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() =>
                  selectMapSearchResult(result)
                }
                className="block w-full border-b border-border px-4 py-3 text-left text-sm font-semibold text-text-secondary transition last:border-b-0 hover:bg-primary-50 hover:text-primary-700"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative mt-5 overflow-hidden rounded-dashboard-card border border-border bg-surface-soft">
        {!leafletLoaded && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface-soft text-sm font-bold text-text-muted">
            Loading map...
          </div>
        )}

        <div
          ref={mapContainerRef}
          className={`h-[420px] w-full ${
            editingBlocked
              ? "pointer-events-none opacity-70"
              : ""
          }`}
        />

        <div className="pointer-events-none absolute left-4 top-4 z-[500] rounded-control border border-border bg-white/95 px-3 py-2 text-xs font-bold text-text-secondary shadow-dashboard">
          Search or click on map to set marker
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            Latitude
          </span>

          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            value={locationForm.latitude}
            disabled={editingBlocked}
            onChange={(event) =>
              updateLocationForm(
                "latitude",
                event.target.value
              )
            }
            onBlur={syncMapFromTypedCoordinates}
            placeholder="Example: 22.9463000"
            className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
              locationFormErrors.latitude
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-border focus:border-primary-500 focus:ring-primary-100"
            }`}
          />

          <FieldError
            message={
              locationFormErrors.latitude
            }
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-secondary">
            Longitude
          </span>

          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            value={locationForm.longitude}
            disabled={editingBlocked}
            onChange={(event) =>
              updateLocationForm(
                "longitude",
                event.target.value
              )
            }
            onBlur={syncMapFromTypedCoordinates}
            placeholder="Example: 79.1944000"
            className={`h-12 w-full rounded-control border bg-surface px-4 text-base text-text-main outline-none transition placeholder:text-text-soft focus:ring-2 ${
              locationFormErrors.longitude
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-border focus:border-primary-500 focus:ring-primary-100"
            }`}
          />

          <FieldError
            message={
              locationFormErrors.longitude
            }
          />
        </label>
      </div>
    </section>

    {/* Location Footer */}

    <section className="sticky bottom-4 z-10 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-text-muted">
          Save the property location before adding
          photos.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => changeStep(1)}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-soft disabled:opacity-60"
          >
            Previous
          </button>

          <Link
            to="/vendor/properties"
            className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-soft"
          >
            Save & Exit
          </Link>


          <button
            type="submit"
            disabled={
              submitting || editingBlocked
            }
            className="inline-flex h-11 min-w-48 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Saving Location..."
              : "Save Location"}
          </button>
        </div>
      </div>
    </section>
  </form>
)}
{/* Photos Step */}

{activeStep === 3 && (
  <div className="space-y-5">
    {/* Upload Property Photos */}

    <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
            Property Photos
          </p>

          <h2 className="mt-1 text-xl font-extrabold text-text-main">
            Upload Property Gallery
          </h2>

          <p className="mt-1 text-sm leading-6 text-text-muted">
            Upload clear exterior, interior,
            bedroom, kitchen and outdoor photos.
          </p>
        </div>

        <span className="rounded-full bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700">
          {propertyImages.length}/20 Photos
        </span>
      </div>

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={handlePropertyImageDrop}
        className={`mt-5 rounded-dashboard-large border-2 border-dashed p-8 text-center transition ${
          dragActive
            ? "border-primary-500 bg-primary-50"
            : "border-border-strong bg-surface-soft"
        }`}
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 20h14" />
          </svg>
        </span>

        <h3 className="mt-4 text-lg font-extrabold text-text-main">
          Drag and drop property photos
        </h3>

        <p className="mt-2 text-sm leading-6 text-text-muted">
          JPG, JPEG, PNG or WEBP. Maximum 8 MB
          per image and 10 images per upload.
        </p>

        <label className="mt-5 inline-flex h-11 cursor-pointer items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800">
          Choose Photos

          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={
              handlePropertyImageChange
            }
            className="hidden"
          />
        </label>
      </div>
    </section>

    {/* Selected Photo Previews */}

    {selectedImages.length > 0 && (
      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-text-main">
              Selected Photos
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Review the photos before uploading.
            </p>
          </div>

          <button
            type="button"
            disabled={uploadingImages}
            onClick={clearSelectedImages}
            className="text-sm font-bold text-red-600 disabled:opacity-50"
          >
            Clear Selection
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {selectedImages.map(
            (selectedImage) => (
              <article
                key={selectedImage.key}
                className="overflow-hidden rounded-xl border border-border bg-surface-soft"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={
                      selectedImage.previewUrl
                    }
                    alt={
                      selectedImage.file.name
                    }
                    className="h-full w-full object-cover"
                  />

                  <button
                    type="button"
                    disabled={uploadingImages}
                    onClick={() =>
                      removeSelectedPropertyImage(
                        selectedImage.key
                      )
                    }
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-red-600 shadow"
                    aria-label="Remove selected image"
                  >
                    ×
                  </button>
                </div>

                <div className="p-3">
                  <strong className="block truncate text-sm text-text-main">
                    {selectedImage.file.name}
                  </strong>

                  <span className="mt-1 block text-xs text-text-muted">
                    {(
                      selectedImage.file.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                    MB
                  </span>
                </div>
              </article>
            )
          )}
        </div>

        {uploadingImages && (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-text-secondary">
                Uploading photos
              </span>

              <span className="text-sm font-extrabold text-primary-700">
                {uploadProgress}%
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-50">
              <div
                className="h-full rounded-full bg-primary-700 transition-all"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() =>
              void handleUploadPropertyImages()
            }
            disabled={
              uploadingImages ||
              selectedImages.length === 0
            }
            className="inline-flex h-11 min-w-48 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingImages
              ? `Uploading ${uploadProgress}%`
              : `Upload ${selectedImages.length} Photo${
                  selectedImages.length === 1
                    ? ""
                    : "s"
                }`}
          </button>
        </div>
      </section>
    )}

    {/* Uploaded Gallery */}

    <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard sm:p-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary-700">
          Gallery Management
        </p>

        <h2 className="mt-1 text-xl font-extrabold text-text-main">
          Uploaded Property Photos
        </h2>

        <p className="mt-1 text-sm leading-6 text-text-muted">
          Select a cover photo and arrange the
          gallery display order.
        </p>
      </div>

      {propertyImages.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {propertyImages.map(
            (image, index) => {
              const processing =
                imageActionId === image.id;

              return (
                <article
                  key={image.id}
                  className={`overflow-hidden rounded-xl border bg-surface ${
                    image.isCover
                      ? "border-primary-400 ring-2 ring-primary-100"
                      : "border-border"
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-soft">
                    <img
                      src={getAssetUrl(
                        image.image
                      )}
                      alt={
                        image.altText ||
                        "Property photo"
                      }
                      className="h-full w-full object-cover"
                    />

                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-text-main shadow">
                      Photo {index + 1}
                    </span>

                    {image.isCover && (
                      <span className="absolute right-3 top-3 rounded-full bg-primary-700 px-3 py-1.5 text-xs font-extrabold text-white shadow">
                        Cover Photo
                      </span>
                    )}

                    {processing && (
                      <div className="absolute inset-0 grid place-items-center bg-white/65 backdrop-blur-sm">
                        <span className="text-sm font-bold text-primary-700">
                          Updating...
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    {!image.isCover && (
                      <button
                        type="button"
                        disabled={Boolean(
                          imageActionId
                        )}
                        onClick={() =>
                          void handleSetCoverImage(
                            image.id
                          )
                        }
                        className="h-10 w-full rounded-control border border-primary-300 bg-primary-50 text-sm font-bold text-primary-700 transition hover:bg-primary-100 disabled:opacity-50"
                      >
                        Set as Cover
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          index === 0 ||
                          Boolean(imageActionId)
                        }
                        onClick={() =>
                          void handleMovePropertyImage(
                            image.id,
                            "previous"
                          )
                        }
                        className="h-10 rounded-control border border-border bg-surface-soft text-sm font-bold text-text-secondary transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Move Left
                      </button>

                      <button
                        type="button"
                        disabled={
                          index ===
                            propertyImages.length -
                              1 ||
                          Boolean(imageActionId)
                        }
                        onClick={() =>
                          void handleMovePropertyImage(
                            image.id,
                            "next"
                          )
                        }
                        className="h-10 rounded-control border border-border bg-surface-soft text-sm font-bold text-text-secondary transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Move Right
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(
                        imageActionId
                      )}
                      onClick={() =>
                        void handleDeletePropertyImage(
                          image.id
                        )
                      }
                      className="h-10 w-full rounded-control border border-red-200 bg-red-50 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete Photo
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </div>
      ) : (
        <div className="mt-5 rounded-dashboard-large border border-dashed border-border-strong bg-surface-soft px-6 py-12 text-center">
          <ImagePlaceholderIcon />

          <h3 className="mt-4 text-lg font-extrabold text-text-main">
            No property photos uploaded
          </h3>

          <p className="mt-2 text-sm text-text-muted">
            Upload at least one clear property
            photo. The first uploaded photo will
            become the cover photo.
          </p>
        </div>
      )}
    </section>

    {/* Photos Footer */}

    <section className="sticky bottom-4 z-10 rounded-dashboard-card border border-border bg-surface/95 p-4 shadow-dashboard-lg backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-text-muted">
          Property photos are saved immediately
          after uploading.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => changeStep(2)}
            disabled={
              uploadingImages ||
              Boolean(imageActionId)
            }
            className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-soft disabled:opacity-60"
          >
            Previous
          </button>

          <Link
            to="/vendor/properties"
            className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-soft"
          >
            Save & Exit
          </Link>

          <button
  type="button"
  disabled={
    propertyImages.length === 0 ||
    uploadingImages ||
    Boolean(imageActionId)
  }
  onClick={() => changeStep(4)}
  className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
>
  Continue to Pricing
</button>
        </div>
      </div>
    </section>
  </div>
)}
{/* Pricing, Amenities and Review Steps */}

{resolvedPropertyId &&
activeStep >= 4 &&
activeStep <= 7 ? (
  <PropertyFinalSteps
    propertyId={resolvedPropertyId}
    activeStep={activeStep as 4 | 5 | 6 | 7}
    editingBlocked={editingBlocked}
    onChangeStep={changeStep}
    onStatusChange={(status) => {
      setPropertyStatus(status);
    }}
  />
) : null}
    </div>
  );
}

import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

import {
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
  icon: string | null;
  image: string | null;
  group: AmenityGroup;
  sortOrder: number;
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

interface RoomAmenity {
  roomTypeId: string;
  amenityId: string;
  amenity: Amenity;
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

  images: RoomImage[];
  amenities: RoomAmenity[];
}

interface RoomDetailResponse {
  success: boolean;
  message: string;
  data: RoomType;
}

interface RoomSaveResponse {
  success: boolean;
  message: string;
  data: RoomType;
}

interface RoomImagesResponse {
  success: boolean;
  message: string;
  data: RoomImage[];
}

interface AmenitiesResponse {
  success: boolean;
  message: string;
  data: Amenity[];
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

interface RoomFormLocationState {
  roomFormError?: string;
}

interface RoomFormValues {
  name: string;
  description: string;
  totalRooms: string;
  maxAdults: string;
  maxChildren: string;
  maxGuests: string;
  beds: string;
  bathrooms: string;
  basePrice: string;
  weekendPrice: string;
  isActive: boolean;
}

/*
|--------------------------------------------------------------------------
| Defaults
|--------------------------------------------------------------------------
*/

const initialFormValues: RoomFormValues = {
  name: "",
  description: "",
  totalRooms: "1",
  maxAdults: "1",
  maxChildren: "0",
  maxGuests: "1",
  beds: "1",
  bathrooms: "1",
  basePrice: "",
  weekendPrice: "",
  isActive: true,
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
| Helpers
|--------------------------------------------------------------------------
*/

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

const getApiFieldErrors = (
  error: unknown
): Record<string, string> => {
  if (
    axios.isAxiosError<ApiErrorResponse>(
      error
    )
  ) {
    return (
      error.response?.data?.errors ||
      {}
    );
  }

  return {};
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

function UploadIcon() {
  return (
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
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 21H6L5 6" />
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
      className="h-4 w-4"
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

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function RoomFormPage() {
  const {
    propertyId: routePropertyId,
    roomTypeId: routeRoomTypeId,
  } = useParams<{
    propertyId: string;
    roomTypeId?: string;
  }>();

  const propertyId = String(
    routePropertyId || ""
  ).trim();

  const roomTypeId = String(
    routeRoomTypeId || ""
  ).trim();

  const isEditMode =
    Boolean(roomTypeId);

  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] =
    useState<RoomFormValues>(
      initialFormValues
    );

  const [amenities, setAmenities] =
    useState<Amenity[]>([]);

  const [
    selectedAmenityIds,
    setSelectedAmenityIds,
  ] = useState<string[]>([]);

  const [
    amenitySearch,
    setAmenitySearch,
  ] = useState("");

  const [
    existingImages,
    setExistingImages,
  ] = useState<RoomImage[]>([]);

  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState<File[]>([]);

  const [
    filePreviews,
    setFilePreviews,
  ] = useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    imageActionId,
    setImageActionId,
  ] = useState<string | null>(null);

  const [pageError, setPageError] =
    useState("");

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<string, string>
  >({});

  /*
  |--------------------------------------------------------------------------
  | Route Error Message
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const state =
      location.state as
        | RoomFormLocationState
        | null;

    if (!state?.roomFormError) {
      return;
    }

    setPageError(
      state.roomFormError
    );

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
  | File Preview URLs
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const previews =
      selectedFiles.map((file) =>
        URL.createObjectURL(file)
      );

    setFilePreviews(previews);

    return () => {
      previews.forEach((preview) =>
        URL.revokeObjectURL(preview)
      );
    };
  }, [selectedFiles]);

  /*
  |--------------------------------------------------------------------------
  | Load Form Data
  |--------------------------------------------------------------------------
  */

  const loadFormData =
    useCallback(async () => {
      if (!propertyId) {
        setPageError(
          "Property ID is missing."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        const requests: [
          Promise<{
            data: AmenitiesResponse;
          }>,
          Promise<{
            data: RoomDetailResponse;
          }>?
        ] = [
          api.get<AmenitiesResponse>(
            "/vendor/amenities"
          ),
        ];

        if (isEditMode) {
          requests.push(
            api.get<RoomDetailResponse>(
              `/vendor/properties/${propertyId}/rooms/${roomTypeId}`
            )
          );
        }

        const responses =
          await Promise.all(requests);

        setAmenities(
          responses[0].data.data ||
            []
        );

        if (
          isEditMode &&
          responses[1]
        ) {
          const room =
            responses[1].data.data;

          setForm({
            name: room.name,
            description:
              room.description || "",
            totalRooms: String(
              room.totalRooms
            ),
            maxAdults: String(
              room.maxAdults
            ),
            maxChildren: String(
              room.maxChildren
            ),
            maxGuests: String(
              room.maxGuests
            ),
            beds: String(room.beds),
            bathrooms: String(
              room.bathrooms
            ),
            basePrice: String(
              room.basePrice
            ),
            weekendPrice:
              room.weekendPrice !==
              null
                ? String(
                    room.weekendPrice
                  )
                : "",
            isActive:
              room.isActive,
          });

          setSelectedAmenityIds(
            room.amenities.map(
              ({ amenityId }) =>
                amenityId
            )
          );

          setExistingImages(
            room.images || []
          );
        }
      } catch (requestError) {
        setPageError(
          getApiErrorMessage(
            requestError,
            "Unable to load room form."
          )
        );
      } finally {
        setLoading(false);
      }
    }, [
      isEditMode,
      propertyId,
      roomTypeId,
    ]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  /*
  |--------------------------------------------------------------------------
  | Amenities
  |--------------------------------------------------------------------------
  */

  const groupedAmenities =
    useMemo(() => {
      const searchText =
        amenitySearch
          .trim()
          .toLowerCase();

      const filteredAmenities =
        amenities.filter(
          (amenity) =>
            !searchText ||
            amenity.name
              .toLowerCase()
              .includes(
                searchText
              ) ||
            amenity.description
              ?.toLowerCase()
              .includes(
                searchText
              )
        );

      return filteredAmenities.reduce(
        (
          groups,
          amenity
        ) => {
          if (
            !groups[
              amenity.group
            ]
          ) {
            groups[
              amenity.group
            ] = [];
          }

          groups[
            amenity.group
          ].push(amenity);

          return groups;
        },
        {} as Record<
          AmenityGroup,
          Amenity[]
        >
      );
    }, [
      amenities,
      amenitySearch,
    ]);

  const toggleAmenity = (
    amenityId: string
  ) => {
    setSelectedAmenityIds(
      (currentIds) =>
        currentIds.includes(
          amenityId
        )
          ? currentIds.filter(
              (id) =>
                id !== amenityId
            )
          : [
              ...currentIds,
              amenityId,
            ]
    );

    setFieldErrors(
      (currentErrors) => ({
        ...currentErrors,
        amenityIds: "",
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Form Fields
  |--------------------------------------------------------------------------
  */

  const updateField = <
    Key extends keyof RoomFormValues,
  >(
    key: Key,
    value: RoomFormValues[Key]
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setFieldErrors(
      (currentErrors) => ({
        ...currentErrors,
        [key]: "",
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Image Selection
  |--------------------------------------------------------------------------
  */

  const handleFileSelection = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const invalidFile =
      files.find(
        (file) =>
          !allowedTypes.includes(
            file.type
          ) ||
          file.size >
            8 * 1024 * 1024
      );

    if (invalidFile) {
      setPageError(
        "Only JPG, JPEG, PNG and WEBP images up to 8 MB are allowed."
      );

      return;
    }

    if (
      existingImages.length +
        selectedFiles.length +
        files.length >
      20
    ) {
      setPageError(
        "A room type can contain a maximum of 20 images."
      );

      return;
    }

    setPageError("");

    setSelectedFiles(
      (currentFiles) => [
        ...currentFiles,
        ...files,
      ]
    );
  };

  const removeSelectedFile = (
    index: number
  ) => {
    setSelectedFiles(
      (currentFiles) =>
        currentFiles.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Existing Image Actions
  |--------------------------------------------------------------------------
  */

  const setCoverImage =
    async (image: RoomImage) => {
      try {
        setImageActionId(
          image.id
        );

        await api.patch(
          `/vendor/properties/${propertyId}/rooms/${roomTypeId}/images/${image.id}/cover`
        );

        const reordered =
          existingImages.map(
            (currentImage) => ({
              ...currentImage,
              isCover:
                currentImage.id ===
                image.id,
            })
          );

        setExistingImages(
          reordered.sort(
            (first, second) =>
              Number(
                second.isCover
              ) -
              Number(
                first.isCover
              )
          )
        );
      } catch (requestError) {
        setPageError(
          getApiErrorMessage(
            requestError,
            "Unable to update cover image."
          )
        );
      } finally {
        setImageActionId(null);
      }
    };

  const deleteExistingImage =
    async (image: RoomImage) => {
      try {
        setImageActionId(
          image.id
        );

        const response =
          await api.delete<RoomImagesResponse>(
            `/vendor/properties/${propertyId}/rooms/${roomTypeId}/images/${image.id}`
          );

        setExistingImages(
          response.data.data ||
            []
        );
      } catch (requestError) {
        setPageError(
          getApiErrorMessage(
            requestError,
            "Unable to delete room image."
          )
        );
      } finally {
        setImageActionId(null);
      }
    };

  const moveExistingImage =
    async (
      index: number,
      direction: -1 | 1
    ) => {
      const nextIndex =
        index + direction;

      if (
        nextIndex < 0 ||
        nextIndex >=
          existingImages.length
      ) {
        return;
      }

      const nextImages = [
        ...existingImages,
      ];

      [
        nextImages[index],
        nextImages[nextIndex],
      ] = [
        nextImages[nextIndex],
        nextImages[index],
      ];

      try {
        setImageActionId(
          existingImages[
            index
          ].id
        );

        const response =
          await api.put<RoomImagesResponse>(
            `/vendor/properties/${propertyId}/rooms/${roomTypeId}/images/reorder`,
            {
              imageIds:
                nextImages.map(
                  (image) =>
                    image.id
                ),
            }
          );

        setExistingImages(
          response.data.data ||
            nextImages
        );
      } catch (requestError) {
        setPageError(
          getApiErrorMessage(
            requestError,
            "Unable to reorder room images."
          )
        );
      } finally {
        setImageActionId(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Client Validation
  |--------------------------------------------------------------------------
  */

  const validateForm = (): boolean => {
    const errors: Record<
      string,
      string
    > = {};

    if (
      form.name.trim().length < 2
    ) {
      errors.name =
        "Room name must contain at least 2 characters.";
    }

    const positiveIntegerFields: Array<
      [
        keyof RoomFormValues,
        string,
        number,
      ]
    > = [
      [
        "totalRooms",
        "Total rooms",
        1,
      ],
      [
        "maxAdults",
        "Maximum adults",
        1,
      ],
      [
        "maxChildren",
        "Maximum children",
        0,
      ],
      [
        "maxGuests",
        "Maximum guests",
        1,
      ],
      ["beds", "Beds", 1],
      [
        "bathrooms",
        "Bathrooms",
        0,
      ],
    ];

    positiveIntegerFields.forEach(
      ([field, label, minimum]) => {
        const value = Number(
          form[field]
        );

        if (
          !Number.isInteger(value) ||
          value < minimum
        ) {
          errors[field] =
            `${label} must be ${minimum} or greater.`;
        }
      }
    );

    if (
      Number(form.maxGuests) <
      Number(form.maxAdults)
    ) {
      errors.maxGuests =
        "Maximum guests cannot be less than maximum adults.";
    }

    if (
      !Number.isFinite(
        Number(form.basePrice)
      ) ||
      Number(form.basePrice) <= 0
    ) {
      errors.basePrice =
        "Base price must be greater than zero.";
    }

    if (
      form.weekendPrice &&
      (
        !Number.isFinite(
          Number(
            form.weekendPrice
          )
        ) ||
        Number(
          form.weekendPrice
        ) <= 0
      )
    ) {
      errors.weekendPrice =
        "Weekend price must be greater than zero.";
    }

    setFieldErrors(errors);

    if (
      Object.keys(errors).length >
      0
    ) {
      setPageError(
        "Please correct the highlighted room information."
      );

      return false;
    }

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const submitRoom = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setPageError("");
    setFieldErrors({});

    const payload = {
      name: form.name.trim(),
      description:
        form.description.trim() ||
        null,

      totalRooms: Number(
        form.totalRooms
      ),

      maxAdults: Number(
        form.maxAdults
      ),

      maxChildren: Number(
        form.maxChildren
      ),

      maxGuests: Number(
        form.maxGuests
      ),

      beds: Number(form.beds),

      bathrooms: Number(
        form.bathrooms
      ),

      basePrice: Number(
        form.basePrice
      ),

      weekendPrice:
        form.weekendPrice
          ? Number(
              form.weekendPrice
            )
          : null,

      isActive:
        form.isActive,

      amenityIds:
        selectedAmenityIds,
    };

    let savedRoomId =
      roomTypeId;

    try {
      const response =
        isEditMode
          ? await api.put<RoomSaveResponse>(
              `/vendor/properties/${propertyId}/rooms/${roomTypeId}`,
              payload
            )
          : await api.post<RoomSaveResponse>(
              `/vendor/properties/${propertyId}/rooms`,
              payload
            );

      savedRoomId =
        response.data.data.id;

      if (
        selectedFiles.length > 0
      ) {
        const imageFormData =
          new FormData();

        selectedFiles.forEach(
          (file) => {
            imageFormData.append(
              "images",
              file
            );
          }
        );

        try {
          await api.post(
            `/vendor/properties/${propertyId}/rooms/${savedRoomId}/images`,
            imageFormData
          );
        } catch (imageError) {
          const errorMessage =
            getApiErrorMessage(
              imageError,
              "Room was saved, but images could not be uploaded."
            );

          navigate(
            `/vendor/properties/${propertyId}/rooms/${savedRoomId}/edit`,
            {
              replace: true,
              state: {
                roomFormError:
                  `Room information was saved. ${errorMessage}`,
              },
            }
          );

          return;
        }
      }

      navigate(
        `/vendor/properties/${propertyId}/rooms`,
        {
          replace: true,
          state: {
            roomMessage:
              response.data.message,
            roomMessageType:
              "success",
          },
        }
      );
    } catch (requestError) {
      setFieldErrors(
        getApiFieldErrors(
          requestError
        )
      );

      setPageError(
        getApiErrorMessage(
          requestError,
          isEditMode
            ? "Unable to update room type."
            : "Unable to create room type."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-dashboard-large bg-surface-muted" />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <div className="space-y-5">
            <div className="h-96 animate-pulse rounded-dashboard-card bg-surface-muted" />
            <div className="h-80 animate-pulse rounded-dashboard-card bg-surface-muted" />
          </div>

          <div className="h-[520px] animate-pulse rounded-dashboard-card bg-surface-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}

      <section className="rounded-dashboard-large border border-border bg-surface p-5 shadow-dashboard">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/vendor/properties/${propertyId}/rooms`
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
              {isEditMode
                ? "Edit Room Type"
                : "Add Room Type"}
            </h1>

            <p className="mt-1 text-sm text-text-muted">
              Configure room inventory,
              capacity, pricing, amenities
              and photos.
            </p>
          </div>
        </div>
      </section>

      {pageError && (
        <section className="rounded-dashboard-card border border-danger/20 bg-danger-soft p-4 text-sm font-semibold text-danger">
          {pageError}
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-5">
          {/* Basic Information */}

          <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Basic Information
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Enter the room category and
              guest capacity.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Room Name
                  <span className="text-danger">
                    {" "}
                    *
                  </span>
                </span>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="Example: Deluxe Room"
                  className={`h-11 w-full rounded-control border bg-surface px-4 text-sm outline-none focus:ring-4 ${
                    fieldErrors.name
                      ? "border-danger focus:ring-danger-soft"
                      : "border-border focus:border-primary-400 focus:ring-primary-100"
                  }`}
                />

                {fieldErrors.name && (
                  <span className="mt-1.5 block text-xs font-semibold text-danger">
                    {fieldErrors.name}
                  </span>
                )}
              </label>

              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Description
                </span>

                <textarea
                  rows={4}
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Describe the room, view, bathroom, balcony and other important details."
                  className="w-full resize-y rounded-control border border-border bg-surface px-4 py-3 text-sm leading-6 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
                />
              </label>

              {[
                [
                  "totalRooms",
                  "Total Room Quantity",
                  "1",
                ],
                [
                  "maxAdults",
                  "Maximum Adults",
                  "1",
                ],
                [
                  "maxChildren",
                  "Maximum Children",
                  "0",
                ],
                [
                  "maxGuests",
                  "Maximum Guests",
                  "1",
                ],
                [
                  "beds",
                  "Beds per Room",
                  "1",
                ],
                [
                  "bathrooms",
                  "Bathrooms per Room",
                  "0",
                ],
              ].map(
                ([
                  field,
                  label,
                  minimum,
                ]) => (
                  <label key={field}>
                    <span className="mb-2 block text-sm font-bold text-text-secondary">
                      {label}
                    </span>

                    <input
                      type="number"
                      min={minimum}
                      step="1"
                      value={
                        form[
                          field as keyof RoomFormValues
                        ] as string
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          field as keyof RoomFormValues,
                          event.target
                            .value as never
                        )
                      }
                      className={`h-11 w-full rounded-control border bg-surface px-4 text-sm outline-none focus:ring-4 ${
                        fieldErrors[
                          field
                        ]
                          ? "border-danger focus:ring-danger-soft"
                          : "border-border focus:border-primary-400 focus:ring-primary-100"
                      }`}
                    />

                    {fieldErrors[
                      field
                    ] && (
                      <span className="mt-1.5 block text-xs font-semibold text-danger">
                        {
                          fieldErrors[
                            field
                          ]
                        }
                      </span>
                    )}
                  </label>
                )
              )}
            </div>
          </section>

          {/* Pricing */}

          <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Room Pricing
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Prices are charged per room,
              per night.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Room Base Price Per Night
                  <span className="text-danger">
                    {" "}
                    *
                  </span>
                </span>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={
                      form.basePrice
                    }
                    onChange={(event) =>
                      updateField(
                        "basePrice",
                        event.target.value
                      )
                    }
                    className={`h-11 w-full rounded-control border bg-surface pl-9 pr-4 text-sm outline-none focus:ring-4 ${
                      fieldErrors.basePrice
                        ? "border-danger focus:ring-danger-soft"
                        : "border-border focus:border-primary-400 focus:ring-primary-100"
                    }`}
                  />
                </div>

                {fieldErrors.basePrice && (
                  <span className="mt-1.5 block text-xs font-semibold text-danger">
                    {
                      fieldErrors.basePrice
                    }
                  </span>
                )}
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-text-secondary">
                  Room Weekend Price Per Night
                </span>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={
                      form.weekendPrice
                    }
                    onChange={(event) =>
                      updateField(
                        "weekendPrice",
                        event.target.value
                      )
                    }
                    placeholder="Uses base price if empty"
                    className={`h-11 w-full rounded-control border bg-surface pl-9 pr-4 text-sm outline-none focus:ring-4 ${
                      fieldErrors.weekendPrice
                        ? "border-danger focus:ring-danger-soft"
                        : "border-border focus:border-primary-400 focus:ring-primary-100"
                    }`}
                  />
                </div>

                {fieldErrors.weekendPrice && (
                  <span className="mt-1.5 block text-xs font-semibold text-danger">
                    {
                      fieldErrors.weekendPrice
                    }
                  </span>
                )}
              </label>
            </div>
          </section>

          {/* Amenities */}

          <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-text-main">
                  Room Amenities
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Select amenities available
                  inside this room type.
                </p>
              </div>

              <span className="text-sm font-bold text-primary-700">
                {
                  selectedAmenityIds.length
                }{" "}
                selected
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
              className="mt-5 h-11 w-full rounded-control border border-border bg-surface px-4 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            />

            <div className="mt-5 space-y-5">
              {Object.entries(
                groupedAmenities
              ).map(
                ([
                  group,
                  groupAmenities,
                ]) => (
                  <div key={group}>
                    <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.13em] text-text-muted">
                      {
                        amenityGroupLabels[
                          group as AmenityGroup
                        ]
                      }
                    </h3>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupAmenities.map(
                        (amenity) => {
                          const selected =
                            selectedAmenityIds.includes(
                              amenity.id
                            );

                          return (
                            <button
                              type="button"
                              key={
                                amenity.id
                              }
                              onClick={() =>
                                toggleAmenity(
                                  amenity.id
                                )
                              }
                              className={`flex items-center gap-3 rounded-dashboard-card border p-3 text-left transition ${
                                selected
                                  ? "border-primary-400 bg-primary-50"
                                  : "border-border bg-surface hover:bg-surface-soft"
                              }`}
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
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-50 font-extrabold text-primary-700">
                                  {amenity.name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </span>
                              )}

                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-sm font-extrabold text-text-main">
                                  {
                                    amenity.name
                                  }
                                </strong>

                                <span className="mt-0.5 block truncate text-xs text-text-muted">
                                  {amenity.description ||
                                    amenityGroupLabels[
                                      amenity.group
                                    ]}
                                </span>
                              </span>

                              <span
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs ${
                                  selected
                                    ? "border-primary-700 bg-primary-700 text-white"
                                    : "border-border bg-surface"
                                }`}
                              >
                                {selected
                                  ? "✓"
                                  : ""}
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )
              )}

              {Object.keys(
                groupedAmenities
              ).length === 0 && (
                <p className="rounded-control bg-surface-muted p-4 text-sm text-text-muted">
                  No amenities match your
                  search.
                </p>
              )}
            </div>
          </section>

          {/* Images */}

          <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Room Photos
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              Upload JPG, PNG or WEBP images.
              Maximum 8 MB each and 20
              images total.
            </p>

            {existingImages.length >
              0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-extrabold text-text-secondary">
                  Uploaded Photos
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {existingImages.map(
                    (image, index) => (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-dashboard-card border border-border bg-surface-soft"
                      >
                        <div className="relative h-40">
                          <img
                            src={getAssetUrl(
                              image.image
                            )}
                            alt={
                              image.altText ||
                              form.name
                            }
                            className="h-full w-full object-cover"
                          />

                          {image.isCover && (
                            <span className="absolute left-2 top-2 rounded-full bg-primary-700 px-2.5 py-1 text-[10px] font-bold text-white">
                              Cover
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 p-3">
                          <button
                            type="button"
                            disabled={
                              image.isCover ||
                              imageActionId ===
                                image.id
                            }
                            onClick={() =>
                              void setCoverImage(
                                image
                              )
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-warning/30 bg-warning-soft px-2.5 text-xs font-bold text-warning disabled:opacity-40"
                          >
                            <StarIcon
                              filled={
                                image.isCover
                              }
                            />
                            Cover
                          </button>

                          <button
                            type="button"
                            disabled={
                              index === 0 ||
                              Boolean(
                                imageActionId
                              )
                            }
                            onClick={() =>
                              void moveExistingImage(
                                index,
                                -1
                              )
                            }
                            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-bold text-text-secondary disabled:opacity-40"
                          >
                            ←
                          </button>

                          <button
                            type="button"
                            disabled={
                              index ===
                                existingImages.length -
                                  1 ||
                              Boolean(
                                imageActionId
                              )
                            }
                            onClick={() =>
                              void moveExistingImage(
                                index,
                                1
                              )
                            }
                            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-bold text-text-secondary disabled:opacity-40"
                          >
                            →
                          </button>

                          <button
                            type="button"
                            disabled={
                              imageActionId ===
                              image.id
                            }
                            onClick={() =>
                              void deleteExistingImage(
                                image
                              )
                            }
                            className="ml-auto grid h-8 w-8 place-items-center rounded-lg bg-danger-soft text-danger disabled:opacity-40"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <label className="mt-5 grid cursor-pointer place-items-center rounded-dashboard-card border-2 border-dashed border-primary-300 bg-primary-50 px-6 py-10 text-center transition hover:bg-primary-100">
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={
                  handleFileSelection
                }
                className="hidden"
              />

              <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-primary-700 shadow-sm">
                <UploadIcon />
              </span>

              <strong className="mt-4 text-base font-extrabold text-text-main">
                Select room photos
              </strong>

              <span className="mt-1 text-sm text-text-muted">
                Select multiple images from
                your computer
              </span>
            </label>

            {selectedFiles.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-extrabold text-text-secondary">
                  New Photos
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedFiles.map(
                    (file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="overflow-hidden rounded-dashboard-card border border-border bg-surface-soft"
                      >
                        <img
                          src={
                            filePreviews[
                              index
                            ]
                          }
                          alt={file.name}
                          className="h-40 w-full object-cover"
                        />

                        <div className="flex items-center gap-2 p-3">
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-secondary">
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeSelectedFile(
                                index
                              )
                            }
                            className="grid h-8 w-8 place-items-center rounded-lg bg-danger-soft text-danger"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}

        <aside className="space-y-5 xl:sticky xl:top-[86px]">
          <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Room Status
            </h2>

            <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-dashboard-card bg-surface-soft p-4">
              <div>
                <strong className="block text-sm font-extrabold text-text-main">
                  Active Room Type
                </strong>

                <span className="mt-1 block text-xs leading-5 text-text-muted">
                  Active rooms can be used in
                  booking inventory.
                </span>
              </div>

              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  updateField(
                    "isActive",
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />
            </label>
          </section>

          <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard">
            <h2 className="text-lg font-extrabold text-text-main">
              Room Summary
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">
                  Room Quantity
                </span>

                <strong className="text-sm text-text-main">
                  {form.totalRooms ||
                    "0"}
                </strong>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">
                  Guest Capacity
                </span>

                <strong className="text-sm text-text-main">
                  {form.maxGuests ||
                    "0"}
                </strong>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">
                  Amenities
                </span>

                <strong className="text-sm text-text-main">
                  {
                    selectedAmenityIds.length
                  }
                </strong>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-text-muted">
                  Photos
                </span>

                <strong className="text-sm text-text-main">
                  {existingImages.length +
                    selectedFiles.length}
                </strong>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <span className="text-sm text-text-muted">
                  Room Base Price
                </span>

                <strong className="text-base text-primary-700">
                  Rs.
                  {form.basePrice ||
                    "0"}
                </strong>
              </div>
            </div>
          </section>

          <section className="rounded-dashboard-card border border-primary-200 bg-primary-50 p-5 shadow-dashboard">
            <h2 className="text-base font-extrabold text-primary-800">
              Save Room Type
            </h2>

            <p className="mt-2 text-sm leading-6 text-primary-700">
              Room information, amenities and
              selected photos will be saved
              together.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  void submitRoom()
                }
                className="h-11 rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update Room Type"
                    : "Create Room Type"}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  navigate(
                    `/vendor/properties/${propertyId}/rooms`
                  )
                }
                className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

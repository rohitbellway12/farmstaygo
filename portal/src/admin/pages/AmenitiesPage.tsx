import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

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

type StatusFilter = "all" | "active" | "inactive";

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
  createdAt: string;
  updatedAt: string;
}

interface AmenityListResponse {
  success: boolean;
  message: string;
  data: Amenity[];
  total: number;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

interface AmenityFormState {
  name: string;
  slug: string;
  description: string;
  group: AmenityGroup;
  isActive: boolean;
  sortOrder: string;
}

type FormErrors = Partial<
  Record<keyof AmenityFormState, string>
>;

interface ToastState {
  type: "success" | "error";
  message: string;
}

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const amenityGroups: Array<{
  value: AmenityGroup;
  label: string;
  description: string;
}> = [
  {
    value: "POPULAR",
    label: "Popular",
    description: "Frequently selected amenities",
  },
  {
    value: "BASIC",
    label: "Basic",
    description: "Essential guest facilities",
  },
  {
    value: "OUTDOOR",
    label: "Outdoor",
    description: "Outdoor spaces and activities",
  },
  {
    value: "INDOOR",
    label: "Indoor",
    description: "Indoor facilities and comforts",
  },
  {
    value: "SAFETY",
    label: "Safety",
    description: "Security and emergency facilities",
  },
  {
    value: "KITCHEN",
    label: "Kitchen",
    description: "Cooking and dining facilities",
  },
  {
    value: "ENTERTAINMENT",
    label: "Entertainment",
    description: "Entertainment and leisure options",
  },
  {
    value: "ACCESSIBILITY",
    label: "Accessibility",
    description: "Accessible guest facilities",
  },
];

const emptyForm: AmenityFormState = {
  name: "",
  slug: "",
  description: "",
  group: "BASIC",
  isActive: true,
  sortOrder: "0",
};

const inputClass =
  "h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

const textareaClass =
  "min-h-28 w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-sm leading-6 text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

const formatDate = (value: string): string => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatGroupName = (
  group: AmenityGroup
): string => {
  return (
    amenityGroups.find(
      (item) => item.value === group
    )?.label || group
  );
};

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

/*
|--------------------------------------------------------------------------
| Shared Icons
|--------------------------------------------------------------------------
*/

function AmenityPageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="m4.22 4.22 2.12 2.12" />
      <path d="m17.66 17.66 2.12 2.12" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m4.22 19.78 2.12-2.12" />
      <path d="m17.66 6.34 2.12-2.12" />
      <circle cx="12" cy="12" r="4" />
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
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
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

/*
|--------------------------------------------------------------------------
| Amenity Visual
|--------------------------------------------------------------------------
*/

function AmenityVisual({
  amenity,
}: {
  amenity: Amenity;
}) {
  if (amenity.image) {
    return (
      <img
        src={getAssetUrl(amenity.image)}
        alt={amenity.name}
        className="h-12 w-12 shrink-0 rounded-xl border border-border bg-surface-soft object-cover"
      />
    );
  }

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
      <AmenityPageIcon />
    </span>
  );
}
/*
|--------------------------------------------------------------------------
| Reusable UI Components
|--------------------------------------------------------------------------
*/

function StatusBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  return (
    <span
      className={
        isActive
          ? "inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success"
          : "inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-text-muted"
      }
    >
      <span
        className={
          isActive
            ? "h-2 w-2 rounded-full bg-success"
            : "h-2 w-2 rounded-full bg-text-soft"
        }
      />

      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function GroupBadge({
  group,
}: {
  group: AmenityGroup;
}) {
  const classes: Record<AmenityGroup, string> = {
    POPULAR: "bg-primary-50 text-primary-700",
    BASIC: "bg-info-soft text-info",
    OUTDOOR: "bg-success-soft text-success",
    INDOOR: "bg-purple-soft text-purple",
    SAFETY: "bg-danger-soft text-danger",
    KITCHEN: "bg-warning-soft text-warning",
    ENTERTAINMENT:
      "bg-chart-blue-soft text-chart-blue",
    ACCESSIBILITY:
      "bg-surface-muted text-text-secondary",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${classes[group]}`}
    >
      {formatGroupName(group)}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  classes,
}: {
  title: string;
  value: number;
  description: string;
  classes: string;
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
          className={`grid h-11 w-11 place-items-center rounded-xl ${classes}`}
        >
          <AmenityPageIcon />
        </span>
      </div>
    </section>
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
            <div className="h-4 w-5 animate-pulse rounded bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-surface-muted" />

              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          </td>

          <td className="px-5 py-4">
            <div className="h-7 w-24 animate-pulse rounded-full bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-7 w-20 animate-pulse rounded-full bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-8 w-20 animate-pulse rounded bg-surface-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Amenities Page
|--------------------------------------------------------------------------
*/

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [groupFilter, setGroupFilter] = useState<
    AmenityGroup | "all"
  >("all");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingAmenity, setEditingAmenity] =
    useState<Amenity | null>(null);

  const [form, setForm] =
    useState<AmenityFormState>(emptyForm);

    const [selectedImage, setSelectedImage] =
  useState<File | null>(null);

const [imagePreview, setImagePreview] =
  useState("");

const [removeExistingImage, setRemoveExistingImage] =
  useState(false);

  const [formErrors, setFormErrors] =
    useState<FormErrors>({});

  const [submitting, setSubmitting] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] =
    useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<Amenity | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] =
    useState<ToastState | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Fetch Amenities
  |--------------------------------------------------------------------------
  */

  const loadAmenities = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response =
        await api.get<AmenityListResponse>(
          "/admin/amenities"
        );

      setAmenities(response.data.data || []);
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load amenities."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAmenities();
  }, [loadAmenities]);

  /*
|--------------------------------------------------------------------------
| Clean Up Local Image Preview
|--------------------------------------------------------------------------
*/

useEffect(() => {
  return () => {
    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
  };
}, [imagePreview]);

  /*
  |--------------------------------------------------------------------------
  | Toast Timer
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [toast]);

  /*
  |--------------------------------------------------------------------------
  | Close Modals With Escape Key
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (!submitting) {
        setModalOpen(false);
      }

      if (!deleting) {
        setDeleteTarget(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, [submitting, deleting]);

  /*
  |--------------------------------------------------------------------------
  | Statistics
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const active = amenities.filter(
      (amenity) => amenity.isActive
    ).length;

    const inactive = amenities.length - active;

    const groups = new Set(
      amenities.map((amenity) => amenity.group)
    ).size;

    const nextSortOrder =
      amenities.length > 0
        ? Math.max(
            ...amenities.map(
              (amenity) => amenity.sortOrder
            )
          ) + 1
        : 1;

    return {
      total: amenities.length,
      active,
      inactive,
      groups,
      nextSortOrder,
    };
  }, [amenities]);

  /*
  |--------------------------------------------------------------------------
  | Filter Amenities
  |--------------------------------------------------------------------------
  */

  const filteredAmenities = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return amenities.filter((amenity) => {
      const matchesSearch =
        !searchText ||
        amenity.name
          .toLowerCase()
          .includes(searchText) ||
        amenity.slug
          .toLowerCase()
          .includes(searchText) ||
        amenity.description
          ?.toLowerCase()
          .includes(searchText);
       
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          amenity.isActive) ||
        (statusFilter === "inactive" &&
          !amenity.isActive);

      const matchesGroup =
        groupFilter === "all" ||
        amenity.group === groupFilter;

      return (
        Boolean(matchesSearch) &&
        matchesStatus &&
        matchesGroup
      );
    });
  }, [
    amenities,
    search,
    statusFilter,
    groupFilter,
  ]);

  /*
|--------------------------------------------------------------------------
| Clear Amenity Image State
|--------------------------------------------------------------------------
*/

const clearImageState = () => {
  if (imagePreview.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview);
  }

  setSelectedImage(null);
  setImagePreview("");
  setRemoveExistingImage(false);
};

/*
|--------------------------------------------------------------------------
| Select Amenity Image
|--------------------------------------------------------------------------
*/

const handleImageChange = (
  event: ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    setToast({
      type: "error",
      message:
        "Only JPG, JPEG, PNG and WEBP images are allowed.",
    });

    event.target.value = "";
    return;
  }

  if (file.size > 1 * 1024 * 1024) {
    setToast({
      type: "error",
      message:
        "Amenity image must not be larger than 1 MB.",
    });

    event.target.value = "";
    return;
  }

  if (imagePreview.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview);
  }

  const previewUrl = URL.createObjectURL(file);

  setSelectedImage(file);
  setImagePreview(previewUrl);
  setRemoveExistingImage(false);

  event.target.value = "";
};

/*
|--------------------------------------------------------------------------
| Remove Amenity Image
|--------------------------------------------------------------------------
*/

const handleRemoveImage = () => {
  if (imagePreview.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview);
  }

  setSelectedImage(null);
  setImagePreview("");

  if (editingAmenity?.image) {
    setRemoveExistingImage(true);
  }
};

  /*
  |--------------------------------------------------------------------------
  | Form Helpers
  |--------------------------------------------------------------------------
  */

  const updateForm = <
    Key extends keyof AmenityFormState
  >(
    key: Key,
    value: AmenityFormState[Key]
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [key]: undefined,
    }));
  };

 const openCreateModal = () => {
  clearImageState();

  setEditingAmenity(null);

  setForm({
    ...emptyForm,
    sortOrder: String(stats.nextSortOrder),
  });

  setFormErrors({});
  setModalOpen(true);
};

 const openEditModal = (amenity: Amenity) => {
  if (imagePreview.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview);
  }

  setEditingAmenity(amenity);
  setSelectedImage(null);

  setImagePreview(
    getAssetUrl(amenity.image)
  );

  setRemoveExistingImage(false);

  setForm({
    name: amenity.name,
    slug: amenity.slug,
    description: amenity.description || "",
    group: amenity.group,
    isActive: amenity.isActive,
    sortOrder: String(amenity.sortOrder),
  });

  setFormErrors({});
  setModalOpen(true);
};

 const closeModal = () => {
  if (submitting) {
    return;
  }

  clearImageState();

  setModalOpen(false);
  setEditingAmenity(null);
  setFormErrors({});
};

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!form.name.trim()) {
      errors.name = "Amenity name is required.";
    }

    if (
      editingAmenity &&
      !form.slug.trim()
    ) {
      errors.slug = "Amenity slug is required.";
    }

    if (!form.group) {
      errors.group = "Amenity group is required.";
    }

    const parsedSortOrder = Number(form.sortOrder);

    if (
      form.sortOrder.trim() === "" ||
      !Number.isInteger(parsedSortOrder) ||
      parsedSortOrder < 0
    ) {
      errors.sortOrder =
        "Sort order must be zero or greater.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /*
  |--------------------------------------------------------------------------
  | Create or Update Amenity
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setFormErrors({});

      /*
|--------------------------------------------------------------------------
| Build Multipart Form Data
|--------------------------------------------------------------------------
*/

const formData = new FormData();

formData.append(
  "name",
  form.name.trim()
);

if (form.slug.trim()) {
  formData.append(
    "slug",
    slugify(form.slug)
  );
}

formData.append(
  "description",
  form.description.trim()
);

formData.append(
  "group",
  form.group
);

formData.append(
  "isActive",
  String(form.isActive)
);

formData.append(
  "sortOrder",
  String(Number(form.sortOrder))
);

if (selectedImage) {
  formData.append(
    "image",
    selectedImage
  );
}

if (
  editingAmenity &&
  removeExistingImage &&
  !selectedImage
) {
  formData.append(
    "removeImage",
    "true"
  );
}

if (editingAmenity) {
  await api.put(
    `/admin/amenities/${editingAmenity.id}`,
    formData
  );
} else {
  await api.post(
    "/admin/amenities",
    formData
  );
}

    setToast({
  type: "success",
  message: editingAmenity
    ? "Amenity updated successfully."
    : "Amenity created successfully.",
});

clearImageState();

setModalOpen(false);
setEditingAmenity(null);

await loadAmenities();
    } catch (error) {
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        const backendErrors =
          error.response?.data?.errors;

        if (backendErrors) {
          setFormErrors(
            backendErrors as FormErrors
          );
        }
      }

      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          editingAmenity
            ? "Unable to update amenity."
            : "Unable to create amenity."
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Update Amenity Status
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = async (
    amenity: Amenity
  ) => {
    try {
      setStatusUpdatingId(amenity.id);

      const nextStatus = !amenity.isActive;

      await api.patch(
        `/admin/amenities/${amenity.id}/status`,
        {
          isActive: nextStatus,
        }
      );

      setAmenities((currentAmenities) =>
        currentAmenities.map((currentAmenity) =>
          currentAmenity.id === amenity.id
            ? {
                ...currentAmenity,
                isActive: nextStatus,
              }
            : currentAmenity
        )
      );

      setToast({
        type: "success",
        message: nextStatus
          ? `${amenity.name} activated successfully.`
          : `${amenity.name} deactivated successfully.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to update amenity status."
        ),
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Delete Amenity
  |--------------------------------------------------------------------------
  */

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);

      await api.delete(
        `/admin/amenities/${deleteTarget.id}`
      );

      setAmenities((currentAmenities) =>
        currentAmenities.filter(
          (amenity) =>
            amenity.id !== deleteTarget.id
        )
      );

      setToast({
        type: "success",
        message: `${deleteTarget.name} deleted successfully.`,
      });

      setDeleteTarget(null);
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to delete amenity."
        ),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}

      {toast && (
        <div
          className={`fixed right-5 top-20 z-[80] flex max-w-sm items-start gap-3 rounded-dashboard-card border px-4 py-3 shadow-dashboard-dropdown ${
            toast.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          <span
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
              toast.type === "success"
                ? "bg-success text-white"
                : "bg-danger text-white"
            }`}
          >
            {toast.type === "success" ? "✓" : "!"}
          </span>

          <p className="text-sm font-semibold">
            {toast.message}
          </p>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Page Header */}

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <AmenityPageIcon />
          </span>

          <div>
            <h1 className="text-2xl font-extrabold text-text-main">
              Amenities
            </h1>

            <p className="mt-1 text-sm text-text-muted">
              Manage facilities vendors can select for
              their property listings.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800"
        >
          <PlusIcon />
          Add Amenity
        </button>
      </section>

      {/* Summary Cards */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Amenities"
          value={stats.total}
          description="All configured facilities"
          classes="bg-primary-50 text-primary-700"
        />

        <StatCard
          title="Active Amenities"
          value={stats.active}
          description="Available in vendor forms"
          classes="bg-success-soft text-success"
        />

        <StatCard
          title="Inactive Amenities"
          value={stats.inactive}
          description="Hidden from vendor selection"
          classes="bg-warning-soft text-warning"
        />

        <StatCard
          title="Amenity Groups"
          value={stats.groups}
          description="Groups currently in use"
          classes="bg-purple-soft text-purple"
        />
      </section>

      {/* Amenity List */}

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Amenity List
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              {filteredAmenities.length} of{" "}
              {amenities.length} amenities shown
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex">
            <div className="relative sm:col-span-2 xl:w-[280px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
                <SearchIcon />
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search amenities..."
                className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <select
              value={groupFilter}
              onChange={(event) =>
                setGroupFilter(
                  event.target.value as
                    | AmenityGroup
                    | "all"
                )
              }
              className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="all">All Groups</option>

              {amenityGroups.map((group) => (
                <option
                  key={group.value}
                  value={group.value}
                >
                  {group.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
              className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="all">
                All Statuses
              </option>
              <option value="active">
                Active Only
              </option>
              <option value="inactive">
                Inactive Only
              </option>
            </select>

            <button
              type="button"
              onClick={() => void loadAmenities()}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-bold text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span
                className={
                  loading ? "animate-spin" : ""
                }
              >
                <RefreshIcon />
              </span>

              Refresh
            </button>
          </div>
        </div>

        {/* API Error */}

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">
              {pageError}
            </p>

            <button
              type="button"
              onClick={() => void loadAmenities()}
              className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Desktop Table */}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {[
                  "#",
                  "Amenity",
                  "Group",
                  "Slug",
                  "Order",
                  "Status",
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
              ) : filteredAmenities.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center"
                  >
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                      <AmenityPageIcon />
                    </span>

                    <h3 className="mt-4 text-base font-extrabold text-text-main">
                      No amenities found
                    </h3>

                    <p className="mt-1 text-sm text-text-muted">
                      Change the filters or add a new
                      amenity.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAmenities.map(
                  (amenity, index) => (
                    <tr
                      key={amenity.id}
                      className="border-b border-border transition last:border-b-0 hover:bg-surface-soft"
                    >
                      <td className="px-5 py-4 text-sm font-bold text-text-muted">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <AmenityVisual
                            amenity={amenity}
                          />

                          <div className="min-w-0">
                            <strong className="block text-sm font-extrabold text-text-main">
                              {amenity.name}
                            </strong>

                            <p className="mt-1 max-w-[300px] truncate text-xs text-text-muted">
                              {amenity.description ||
                                "No description added"}
                            </p>

                         
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <GroupBadge
                          group={amenity.group}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <code className="rounded-md bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-text-secondary">
                          {amenity.slug}
                        </code>
                      </td>

                      <td className="px-5 py-4">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-sm font-extrabold text-primary-700">
                          {amenity.sortOrder}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={
                              statusUpdatingId ===
                              amenity.id
                            }
                            onClick={() =>
                              void handleStatusChange(
                                amenity
                              )
                            }
                            className={`relative h-6 w-11 rounded-full transition ${
                              amenity.isActive
                                ? "bg-primary-600"
                                : "bg-border-strong"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                                amenity.isActive
                                  ? "left-6"
                                  : "left-1"
                              }`}
                            />
                          </button>

                          <StatusBadge
                            isActive={
                              amenity.isActive
                            }
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {formatDate(
                          amenity.updatedAt
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(amenity)
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                          >
                            <EditIcon />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(
                                amenity
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
                          >
                            <DeleteIcon />
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

        <div className="divide-y divide-border md:hidden">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-44 animate-pulse rounded-dashboard-card bg-surface-muted"
                />
              ))}
            </div>
          ) : filteredAmenities.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                <AmenityPageIcon />
              </span>

              <h3 className="mt-4 text-base font-extrabold text-text-main">
                No amenities found
              </h3>
            </div>
          ) : (
            filteredAmenities.map((amenity) => (
              <article
                key={amenity.id}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <AmenityVisual amenity={amenity} />

                  <div className="min-w-0 flex-1">
                    <strong className="block text-base font-extrabold text-text-main">
                      {amenity.name}
                    </strong>

                    <code className="mt-1 block text-xs text-text-muted">
                      {amenity.slug}
                    </code>

                    <div className="mt-2">
                      <GroupBadge
                        group={amenity.group}
                      />
                    </div>
                  </div>

                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-sm font-extrabold text-primary-700">
                    {amenity.sortOrder}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {amenity.description ||
                    "No description added."}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        statusUpdatingId === amenity.id
                      }
                      onClick={() =>
                        void handleStatusChange(
                          amenity
                        )
                      }
                      className={`relative h-6 w-11 rounded-full ${
                        amenity.isActive
                          ? "bg-primary-600"
                          : "bg-border-strong"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                          amenity.isActive
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </button>

                    <StatusBadge
                      isActive={amenity.isActive}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditModal(amenity)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary"
                    >
                      <EditIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget(amenity)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-danger"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Add and Edit Modal */}

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeModal}
            aria-label="Close amenity modal"
          />

          <section className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard-dropdown">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-text-main">
                  {editingAmenity
                    ? "Edit Amenity"
                    : "Add Amenity"}
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  {editingAmenity
                    ? "Update amenity information and availability."
                    : "Create an amenity for vendor property listings."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(100vh-210px)] space-y-5 overflow-y-auto px-6 py-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-text-secondary">
                      Amenity Name
                      <span className="text-danger">
                        {" "}
                        *
                      </span>
                    </span>

                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        updateForm("name", value);

                        if (!editingAmenity) {
                          updateForm(
                            "slug",
                            slugify(value)
                          );
                        }
                      }}
                      placeholder="For example: Wi-Fi"
                      className={`${inputClass} ${
                        formErrors.name
                          ? "border-danger"
                          : ""
                      }`}
                    />

                    {formErrors.name && (
                      <span className="mt-1.5 block text-xs font-semibold text-danger">
                        {formErrors.name}
                      </span>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-text-secondary">
                      URL Slug
                    </span>

                    <input
                      type="text"
                      value={form.slug}
                      onChange={(event) =>
                        updateForm(
                          "slug",
                          slugify(
                            event.target.value
                          )
                        )
                      }
                      placeholder="wi-fi"
                      className={`${inputClass} ${
                        formErrors.slug
                          ? "border-danger"
                          : ""
                      }`}
                    />

                    {formErrors.slug ? (
                      <span className="mt-1.5 block text-xs font-semibold text-danger">
                        {formErrors.slug}
                      </span>
                    ) : (
                      <span className="mt-1.5 block text-xs text-text-muted">
                        Generated automatically from
                        amenity name.
                      </span>
                    )}
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-text-secondary">
                    Description
                  </span>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value
                      )
                    }
                    placeholder="Describe the amenity..."
                    className={textareaClass}
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-text-secondary">
                      Amenity Group
                      <span className="text-danger">
                        {" "}
                        *
                      </span>
                    </span>

                    <select
                      value={form.group}
                      onChange={(event) =>
                        updateForm(
                          "group",
                          event.target
                            .value as AmenityGroup
                        )
                      }
                      className={`${inputClass} ${
                        formErrors.group
                          ? "border-danger"
                          : ""
                      }`}
                    >
                      {amenityGroups.map((group) => (
                        <option
                          key={group.value}
                          value={group.value}
                        >
                          {group.label}
                        </option>
                      ))}
                    </select>

                    {formErrors.group && (
                      <span className="mt-1.5 block text-xs font-semibold text-danger">
                        {formErrors.group}
                      </span>
                    )}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-text-secondary">
                      Sort Order
                      <span className="text-danger">
                        {" "}
                        *
                      </span>
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.sortOrder}
                      onChange={(event) =>
                        updateForm(
                          "sortOrder",
                          event.target.value
                        )
                      }
                      className={`${inputClass} ${
                        formErrors.sortOrder
                          ? "border-danger"
                          : ""
                      }`}
                    />

                    {formErrors.sortOrder && (
                      <span className="mt-1.5 block text-xs font-semibold text-danger">
                        {formErrors.sortOrder}
                      </span>
                    )}
                  </label>
                </div>

               {/* Amenity Image Upload */}

<div>
  <span className="mb-2 block text-sm font-bold text-text-secondary">
    Amenity Icon Image
  </span>

  <div className="rounded-dashboard-card border border-dashed border-border-strong bg-surface-soft p-4">
    {imagePreview ? (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-28 w-full shrink-0 place-items-center overflow-hidden rounded-dashboard-card border border-border bg-surface sm:w-32">
          <img
            src={imagePreview}
            alt="Amenity preview"
            className="h-full w-full object-contain p-3"
          />
        </div>

        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-extrabold text-text-main">
            {selectedImage
              ? selectedImage.name
              : "Current amenity image"}
          </strong>

          <p className="mt-1 text-xs leading-5 text-text-muted">
            Use a square PNG or WEBP image with a
            transparent background. Maximum file size
            is 1 MB.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-control border border-primary-300 bg-primary-50 px-4 text-xs font-bold text-primary-700 transition hover:bg-primary-100">
              Replace Image

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleRemoveImage}
              className="h-9 rounded-control border border-danger/30 bg-danger-soft px-4 text-xs font-bold text-danger transition hover:bg-danger/10"
            >
              Remove Image
            </button>
          </div>
        </div>
      </div>
    ) : (
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-dashboard-card px-5 py-8 text-center transition hover:bg-primary-50">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary-700">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 20h14" />
          </svg>
        </span>

        <strong className="mt-3 text-sm font-extrabold text-text-main">
          Choose Amenity Image
        </strong>

        <span className="mt-1 text-xs text-text-muted">
          PNG, JPG or WEBP up to 1 MB
        </span>

        <span className="mt-1 text-xs text-text-soft">
          Square transparent image recommended
        </span>

        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          className="hidden"
        />
      </label>
    )}
  </div>
</div>

                <div className="flex items-center justify-between gap-4 rounded-dashboard-card border border-border bg-surface-soft p-4">
                  <div>
                    <strong className="block text-sm font-extrabold text-text-main">
                      Active Amenity
                    </strong>

                    <p className="mt-1 text-xs leading-5 text-text-muted">
                      Active amenities are available in
                      the Vendor Add Property form.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateForm(
                        "isActive",
                        !form.isActive
                      )
                    }
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      form.isActive
                        ? "bg-primary-600"
                        : "bg-border-strong"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        form.isActive
                          ? "left-6"
                          : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-border bg-surface-soft px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}

                  {submitting
                    ? "Saving..."
                    : editingAmenity
                    ? "Update Amenity"
                    : "Create Amenity"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Delete Confirmation */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              if (!deleting) {
                setDeleteTarget(null);
              }
            }}
          />

          <section className="relative z-10 w-full max-w-md rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard-dropdown">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
              <DeleteIcon />
            </span>

            <h2 className="mt-4 text-xl font-extrabold text-text-main">
              Delete Amenity?
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              You are about to delete{" "}
              <strong className="text-text-main">
                {deleteTarget.name}
              </strong>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="h-11 rounded-control border border-border px-5 text-sm font-bold text-text-secondary hover:bg-surface-muted disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-danger px-5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}

                {deleting
                  ? "Deleting..."
                  : "Delete Amenity"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../shared/api/api";
import { getAssetUrl } from "../../shared/config/assets";

interface PropertyCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryListResponse {
  success: boolean;
  message: string;
  data: PropertyCategory[];
  total: number;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  isActive: boolean;
  sortOrder: string;
}

type CategoryFilter = "all" | "active" | "inactive";

type FormErrors = Partial<
  Record<keyof CategoryFormState, string>
>;

interface ToastState {
  type: "success" | "error";
  message: string;
}

const emptyForm: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  image: "",
  isActive: true,
  sortOrder: "0",
};

const inputClass =
  "h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

const textareaClass =
  "min-h-28 w-full resize-y rounded-control border border-border bg-surface px-3.5 py-3 text-sm text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

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

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

function PageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
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

function CategoryFallbackIcon({
  category,
}: {
  category: PropertyCategory;
}) {
  const categoryName = `${category.name} ${category.icon || ""}`
    .toLowerCase();

  if (
    categoryName.includes("resort") ||
    categoryName.includes("hotel")
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 21V5h12v16" />
        <path d="M16 9h4v12" />
        <path d="M8 9h2" />
        <path d="M8 13h2" />
        <path d="M8 17h2" />
        <path d="M3 21h18" />
      </svg>
    );
  }

  if (
    categoryName.includes("villa") ||
    categoryName.includes("cottage") ||
    categoryName.includes("home")
  ) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  return <PageIcon />;
}

function CategoryVisual({
  category,
}: {
  category: PropertyCategory;
}) {
  if (category.image) {
    return (
      <img
  src={getAssetUrl(category.image)}
  alt={category.name}
  className="h-12 w-12 rounded-xl border border-border object-cover"
/>
    );
  }

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700">
      <CategoryFallbackIcon category={category} />
    </span>
  );
}

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

function StatCard({
  title,
  value,
  description,
  variant,
}: {
  title: string;
  value: number;
  description: string;
  variant: "green" | "blue" | "orange" | "purple";
}) {
  const variants = {
    green: "bg-primary-50 text-primary-700",
    blue: "bg-info-soft text-info",
    orange: "bg-warning-soft text-warning",
    purple: "bg-purple-soft text-purple",
  };

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
          className={`grid h-11 w-11 place-items-center rounded-xl ${variants[variant]}`}
        >
          <PageIcon />
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
            <div className="h-5 w-5 animate-pulse rounded bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-surface-muted" />

              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-52 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-4 w-10 animate-pulse rounded bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-7 w-20 animate-pulse rounded-full bg-surface-muted" />
          </td>

          <td className="px-5 py-4">
            <div className="h-8 w-24 animate-pulse rounded bg-surface-muted" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function PropertyCategoriesPage() {
  const [categories, setCategories] = useState<
    PropertyCategory[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<CategoryFilter>("all");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] =
    useState<PropertyCategory | null>(null);

  const [form, setForm] =
    useState<CategoryFormState>(emptyForm);

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
    useState<PropertyCategory | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] =
    useState<ToastState | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response =
        await api.get<CategoryListResponse>(
          "/admin/property-categories"
        );

      setCategories(response.data.data || []);
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load property categories."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [toast]);

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
  }, [deleting, submitting]);

  const filteredCategories = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesStatus =
        filter === "all" ||
        (filter === "active" && category.isActive) ||
        (filter === "inactive" && !category.isActive);

      const matchesSearch =
        !searchText ||
        category.name.toLowerCase().includes(searchText) ||
        category.slug.toLowerCase().includes(searchText) ||
        category.description
          ?.toLowerCase()
          .includes(searchText) ||
        category.icon
          ?.toLowerCase()
          .includes(searchText);

      return matchesStatus && Boolean(matchesSearch);
    });
  }, [categories, filter, search]);

  const stats = useMemo(() => {
    const active = categories.filter(
      (category) => category.isActive
    ).length;

    const inactive = categories.length - active;

    const nextSortOrder =
      categories.length > 0
        ? Math.max(
            ...categories.map(
              (category) => category.sortOrder
            )
          ) + 1
        : 1;

    return {
      total: categories.length,
      active,
      inactive,
      nextSortOrder,
    };
  }, [categories]);

  // const resetForm = () => {
  //   setForm({
  //     ...emptyForm,
  //     sortOrder: String(stats.nextSortOrder),
  //   });

  //   setFormErrors({});
  //   setEditingCategory(null);
  // };

  const openCreateModal = () => {
  clearImageState();

  setEditingCategory(null);

  setForm({
    ...emptyForm,
    sortOrder: String(stats.nextSortOrder),
  });

  setFormErrors({});
  setModalOpen(true);
};

  const openEditModal = (
  category: PropertyCategory
) => {
  if (imagePreview.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview);
  }

  setEditingCategory(category);

  setSelectedImage(null);

  setImagePreview(
    getAssetUrl(category.image)
  );

  setRemoveExistingImage(false);

  setForm({
    name: category.name,
    slug: category.slug,
    description: category.description || "",
    icon: category.icon || "",
    image: "",
    isActive: category.isActive,
    sortOrder: String(category.sortOrder),
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
  setEditingCategory(null);
  setFormErrors({});
};

  /*
|--------------------------------------------------------------------------
| Reset Selected Image
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
| Select Category Image
|--------------------------------------------------------------------------
*/

const handleImageChange = (
  event: React.ChangeEvent<HTMLInputElement>
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

  if (file.size > 5 * 1024 * 1024) {
    setToast({
      type: "error",
      message:
        "Category image must not be larger than 5 MB.",
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
};

/*
|--------------------------------------------------------------------------
| Remove Category Image
|--------------------------------------------------------------------------
*/

const handleRemoveImage = () => {
  if (imagePreview.startsWith("blob:")) {
    URL.revokeObjectURL(imagePreview);
  }

  setSelectedImage(null);
  setImagePreview("");

  if (editingCategory?.image) {
    setRemoveExistingImage(true);
  }
};

  const updateForm = <
    Key extends keyof CategoryFormState
  >(
    key: Key,
    value: CategoryFormState[Key]
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

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!form.name.trim()) {
      errors.name = "Category name is required.";
    }

    if (
      editingCategory &&
      !form.slug.trim()
    ) {
      errors.slug = "Slug is required while editing.";
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

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
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
  "icon",
  form.icon.trim()
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
  editingCategory &&
  removeExistingImage &&
  !selectedImage
) {
  formData.append(
    "removeImage",
    "true"
  );
}

if (editingCategory) {
  await api.put(
    `/admin/property-categories/${editingCategory.id}`,
    formData
  );
} else {
  await api.post(
    "/admin/property-categories",
    formData
  );
}

      setToast({
  type: "success",
  message: editingCategory
    ? "Property category updated successfully."
    : "Property category created successfully.",
});

clearImageState();

setModalOpen(false);
setEditingCategory(null);

await loadCategories();
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
          editingCategory
            ? "Unable to update property category."
            : "Unable to create property category."
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    category: PropertyCategory
  ) => {
    try {
      setStatusUpdatingId(category.id);

      const nextStatus = !category.isActive;

      await api.patch(
        `/admin/property-categories/${category.id}/status`,
        {
          isActive: nextStatus,
        }
      );

      setCategories((currentCategories) =>
        currentCategories.map((currentCategory) =>
          currentCategory.id === category.id
            ? {
                ...currentCategory,
                isActive: nextStatus,
              }
            : currentCategory
        )
      );

      setToast({
        type: "success",
        message: nextStatus
          ? `${category.name} activated successfully.`
          : `${category.name} deactivated successfully.`,
      });
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to update category status."
        ),
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);

      await api.delete(
        `/admin/property-categories/${deleteTarget.id}`
      );

      setCategories((currentCategories) =>
        currentCategories.filter(
          (category) =>
            category.id !== deleteTarget.id
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
          "Unable to delete property category."
        ),
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
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

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <PageIcon />
            </span>

            <div>
              <h1 className="text-2xl font-extrabold text-text-main">
                Property Categories
              </h1>

              <p className="mt-1 text-sm text-text-muted">
                Manage the property types vendors can
                select while creating listings.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-800"
        >
          <PlusIcon />
          Add Category
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Categories"
          value={stats.total}
          description="All configured property types"
          variant="green"
        />

        <StatCard
          title="Active Categories"
          value={stats.active}
          description="Available in vendor forms"
          variant="blue"
        />

        <StatCard
          title="Inactive Categories"
          value={stats.inactive}
          description="Hidden from vendor selection"
          variant="orange"
        />

        <StatCard
          title="Next Sort Order"
          value={stats.nextSortOrder}
          description="Suggested order for new category"
          variant="purple"
        />
      </section>

      <section className="overflow-hidden rounded-dashboard-card border border-border bg-surface shadow-dashboard-card">
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Category List
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              {filteredCategories.length} of{" "}
              {categories.length} categories shown
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 sm:w-[300px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-soft">
                <SearchIcon />
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search categories..."
                className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm text-text-main outline-none placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as CategoryFilter
                )
              }
              className="h-11 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-text-secondary outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">
                Inactive Only
              </option>
            </select>

            <button
              type="button"
              onClick={() => void loadCategories()}
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

        {pageError && (
          <div className="m-5 flex flex-col items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-soft px-4 py-4 sm:flex-row">
            <p className="text-sm font-semibold text-danger">
              {pageError}
            </p>

            <button
              type="button"
              onClick={() => void loadCategories()}
              className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                <th className="w-16 px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  #
                </th>

                <th className="px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  Category
                </th>

                <th className="px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  Slug
                </th>

                <th className="px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  Order
                </th>

                <th className="px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  Status
                </th>

                <th className="px-5 py-3.5 text-left text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  Updated
                </th>

                <th className="px-5 py-3.5 text-right text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <LoadingRows />
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center"
                  >
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                      <PageIcon />
                    </span>

                    <h3 className="mt-4 text-base font-extrabold text-text-main">
                      No categories found
                    </h3>

                    <p className="mt-1 text-sm text-text-muted">
                      Change your filters or add a new
                      property category.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map(
                  (category, index) => (
                    <tr
                      key={category.id}
                      className="border-b border-border transition last:border-b-0 hover:bg-surface-soft"
                    >
                      <td className="px-5 py-4 text-sm font-bold text-text-muted">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CategoryVisual
                            category={category}
                          />

                          <div className="min-w-0">
                            <strong className="block text-sm font-extrabold text-text-main">
                              {category.name}
                            </strong>

                            <p className="mt-1 max-w-[340px] truncate text-xs text-text-muted">
                              {category.description ||
                                "No description added"}
                            </p>

                            {category.icon && (
                              <span className="mt-1 block text-xs text-primary-700">
                                Icon: {category.icon}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <code className="rounded-md bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-text-secondary">
                          {category.slug}
                        </code>
                      </td>

                      <td className="px-5 py-4">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-sm font-extrabold text-primary-700">
                          {category.sortOrder}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={
                              statusUpdatingId ===
                              category.id
                            }
                            onClick={() =>
                              void handleStatusChange(
                                category
                              )
                            }
                            className={`relative h-6 w-11 rounded-full transition ${
                              category.isActive
                                ? "bg-primary-600"
                                : "bg-border-strong"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                            aria-label={`${
                              category.isActive
                                ? "Deactivate"
                                : "Activate"
                            } ${category.name}`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                                category.isActive
                                  ? "left-6"
                                  : "left-1"
                              }`}
                            />
                          </button>

                          <StatusBadge
                            isActive={
                              category.isActive
                            }
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-text-secondary">
                        {formatDate(
                          category.updatedAt
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(category)
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                            aria-label={`Edit ${category.name}`}
                          >
                            <EditIcon />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(
                                category
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-text-secondary transition hover:border-danger/30 hover:bg-danger-soft hover:text-danger"
                            aria-label={`Delete ${category.name}`}
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

        <div className="divide-y divide-border md:hidden">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-40 animate-pulse rounded-dashboard-card bg-surface-muted"
                />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-50 text-primary-700">
                <PageIcon />
              </span>

              <h3 className="mt-4 text-base font-extrabold text-text-main">
                No categories found
              </h3>

              <p className="mt-1 text-sm text-text-muted">
                Change your filters or add a new
                category.
              </p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <article
                key={category.id}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <CategoryVisual
                    category={category}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="block text-base font-extrabold text-text-main">
                          {category.name}
                        </strong>

                        <code className="mt-1 block text-xs text-text-muted">
                          {category.slug}
                        </code>
                      </div>

                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-50 text-sm font-extrabold text-primary-700">
                        {category.sortOrder}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      {category.description ||
                        "No description added."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleStatusChange(
                          category
                        )
                      }
                      disabled={
                        statusUpdatingId ===
                        category.id
                      }
                      className={`relative h-6 w-11 rounded-full ${
                        category.isActive
                          ? "bg-primary-600"
                          : "bg-border-strong"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                          category.isActive
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </button>

                    <StatusBadge
                      isActive={category.isActive}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditModal(category)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-text-secondary"
                    >
                      <EditIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget(category)
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

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4">
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeModal}
            aria-label="Close modal"
          />

          <section className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-dashboard-large border border-border bg-surface shadow-dashboard-dropdown">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="text-xl font-extrabold text-text-main">
                  {editingCategory
                    ? "Edit Property Category"
                    : "Add Property Category"}
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  {editingCategory
                    ? "Update the category information and availability."
                    : "Create a property type for vendor listings."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition hover:bg-surface-muted hover:text-text-main"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(100vh-210px)] space-y-5 overflow-y-auto px-6 py-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-text-secondary">
                      Category Name
                      <span className="text-danger">
                        {" "}
                        *
                      </span>
                    </span>

                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => {
                        const newName =
                          event.target.value;

                        updateForm(
                          "name",
                          newName
                        );

                        if (!editingCategory) {
                          updateForm(
                            "slug",
                            slugify(newName)
                          );
                        }
                      }}
                      placeholder="For example: Farmhouse"
                      className={`${inputClass} ${
                        formErrors.name
                          ? "border-danger focus:border-danger focus:ring-danger-soft"
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
                      placeholder="farmhouse"
                      className={`${inputClass} ${
                        formErrors.slug
                          ? "border-danger focus:border-danger focus:ring-danger-soft"
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
                        category name.
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
                    placeholder="Describe this property category..."
                    className={textareaClass}
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-text-secondary">
                      Icon Key
                    </span>

                    <input
                      type="text"
                      value={form.icon}
                      onChange={(event) =>
                        updateForm(
                          "icon",
                          event.target.value
                        )
                      }
                      placeholder="home, villa, resort"
                      className={inputClass}
                    />

                    <span className="mt-1.5 block text-xs text-text-muted">
                      Temporary icon identifier. Icon
                      picker will be added later.
                    </span>
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
                          ? "border-danger focus:border-danger focus:ring-danger-soft"
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

                {/* Category Image Upload */}

<div>
  <span className="mb-2 block text-sm font-bold text-text-secondary">
    Category Image
  </span>

  <div className="rounded-dashboard-card border border-dashed border-border-strong bg-surface-soft p-4">
    {imagePreview ? (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img
          src={imagePreview}
          alt="Category preview"
          className="h-28 w-full rounded-dashboard-card border border-border object-cover sm:w-36"
        />

        <div className="min-w-0 flex-1">
          <strong className="block text-sm font-extrabold text-text-main">
            {selectedImage
              ? selectedImage.name
              : "Current category image"}
          </strong>

          <p className="mt-1 text-xs leading-5 text-text-muted">
            JPG, JPEG, PNG or WEBP. Maximum file
            size is 5 MB.
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
          Choose Category Image
        </strong>

        <span className="mt-1 text-xs text-text-muted">
          JPG, JPEG, PNG or WEBP up to 5 MB
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
                      Active Category
                    </strong>

                    <p className="mt-1 text-xs leading-5 text-text-muted">
                      Active categories are available
                      in the Vendor Add Property form.
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
                  className="h-11 rounded-control border border-border bg-surface px-5 text-sm font-bold text-text-secondary transition hover:bg-surface-muted disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary-700 px-6 text-sm font-bold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}

                  {submitting
                    ? "Saving..."
                    : editingCategory
                    ? "Update Category"
                    : "Create Category"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

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
            aria-label="Close confirmation"
          />

          <section className="relative z-10 w-full max-w-md rounded-dashboard-large border border-border bg-surface p-6 shadow-dashboard-dropdown">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
              <DeleteIcon />
            </span>

            <h2 className="mt-4 text-xl font-extrabold text-text-main">
              Delete Property Category?
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
                onClick={() =>
                  void handleDelete()
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-danger px-5 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}

                {deleting
                  ? "Deleting..."
                  : "Delete Category"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
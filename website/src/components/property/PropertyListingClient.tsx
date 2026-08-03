"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import PropertyCard from "./PropertyCard";
import { apiFetch } from "@/lib/api";
import type {
  PublicCategoriesResponse,
  PublicCategory,
  PublicPropertiesResponse,
  PublicPropertyCard,
  PublicServiceCitiesResponse,
  PublicServiceCity,
} from "@/types/public";

type PropertyBookingFilter =
  | ""
  | "ENTIRE_PROPERTY"
  | "ROOM_WISE"
  | "BOTH";

type PropertySort =
  | "RECOMMENDED"
  | "NEWEST"
  | "PRICE_LOW"
  | "PRICE_HIGH"
  | "FEATURED";

interface FilterFormState {
  city: string;
  category: string;
  bookingType: PropertyBookingFilter;
  checkIn: string;
  checkOut: string;
  guests: string;
  rooms: string;
  minimumPrice: string;
  maximumPrice: string;
  featured: boolean;
}

interface ToastState {
  message: string;
}

const defaultFilters: FilterFormState = {
  city: "",
  category: "",
  bookingType: "",
  checkIn: "",
  checkOut: "",
  guests: "1",
  rooms: "1",
  minimumPrice: "",
  maximumPrice: "",
  featured: false,
};

const sortOptions: Array<{
  value: PropertySort;
  label: string;
}> = [
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "NEWEST", label: "Newest First" },
  { value: "PRICE_LOW", label: "Price: Low to High" },
  { value: "PRICE_HIGH", label: "Price: High to Low" },
  { value: "FEATURED", label: "Featured First" },
];

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInitialFilters(
  searchParams: URLSearchParams
): FilterFormState {
  const bookingType = searchParams.get("bookingType") || "";

  const validBookingType: PropertyBookingFilter =
    bookingType === "ENTIRE_PROPERTY" ||
    bookingType === "ROOM_WISE" ||
    bookingType === "BOTH"
      ? bookingType
      : "";

  return {
    city: searchParams.get("city") || "",
    category: searchParams.get("category") || "",
    bookingType: validBookingType,
    checkIn: searchParams.get("checkIn") || "",
    checkOut: searchParams.get("checkOut") || "",
    guests: searchParams.get("guests") || "1",
    rooms: searchParams.get("rooms") || "1",
    minimumPrice: searchParams.get("minimumPrice") || "",
    maximumPrice: searchParams.get("maximumPrice") || "",
    featured: searchParams.get("featured") === "true",
  };
}

function getNumberLabel(
  value: string,
  singular: string,
  plural: string
): string {
  return `${value} ${Number(value) === 1 ? singular : plural}`;
}

function buildApiQuery(
  searchParams: URLSearchParams
): string {
  const query = new URLSearchParams();

  [
    "search",
    "city",
    "category",
    "bookingType",
    "checkIn",
    "checkOut",
    "guests",
    "rooms",
    "minimumPrice",
    "maximumPrice",
    "featured",
    "sort",
    "page",
    "limit",
  ].forEach((parameter) => {
    const value = searchParams.get(parameter);

    if (value) {
      query.set(parameter, value);
    }
  });

  if (!query.has("limit")) {
    query.set("limit", "12");
  }

  if (!query.has("sort")) {
    query.set("sort", "RECOMMENDED");
  }

  return query.toString();
}

function buildPropertyHref(
  publicId: string,
  searchParams: URLSearchParams
): string {
  const preserved = new URLSearchParams();

  ["checkIn", "checkOut", "guests", "rooms"].forEach(
    (parameter) => {
      const value = searchParams.get(parameter);

      if (value) {
        preserved.set(parameter, value);
      }
    }
  );

  const query = preserved.toString();

  return query
    ? `/properties/${publicId}?${query}`
    : `/properties/${publicId}`;
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

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
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

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function FilterPanel({
  filters,
  categories,
  cities,
  minimumDate,
  onFieldChange,
  onApply,
  onClear,
}: {
  filters: FilterFormState;
  categories: PublicCategory[];
  cities: PublicServiceCity[];
  minimumDate: string;
  onFieldChange: <Key extends keyof FilterFormState>(
    key: Key,
    value: FilterFormState[Key]
  ) => void;
  onApply: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  const [cityOpen, setCityOpen] =
    useState(false);

  const selectedCity =
    cities.find(
      (city) => city.name === filters.city
    );

  const selectedCityLabel = selectedCity
    ? `${selectedCity.name}, ${selectedCity.state}`
    : "All available cities";

  return (
    <form onSubmit={onApply} className="space-y-6">
      <div>
        <label className="mb-2 block text-[12px] font-extrabold text-ink-800">
          Select city
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            <SearchIcon />
          </span>

          <button
            type="button"
            onClick={() =>
              setCityOpen((open) => !open)
            }
            className="flex h-11 w-full items-center justify-between rounded-lg border border-ink-200 bg-white pl-11 pr-3 text-left text-sm font-extrabold text-ink-800 outline-none transition hover:border-brand-300 hover:bg-brand-50/35 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
          >
            <span className="truncate">
              {selectedCityLabel}
            </span>

            <svg
              viewBox="0 0 24 24"
              className="ml-2 h-4 w-4 shrink-0 text-brand-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {cityOpen && (
            <div className="absolute left-0 top-[48px] z-50 w-full overflow-hidden rounded-xl border border-brand-200 bg-white shadow-[0_18px_40px_rgba(23,35,27,0.16)]">
              {[
                {
                  id: "all",
                  name: "",
                  label:
                    "All available cities",
                },
                ...cities.map((city) => ({
                  id: city.id,
                  name: city.name,
                  label: `${city.name}, ${city.state}`,
                })),
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onFieldChange(
                      "city",
                      option.name
                    );
                    setCityOpen(false);
                  }}
                  className={`block w-full px-3 py-2.5 text-left text-sm font-bold transition ${
                    filters.city === option.name
                      ? "bg-brand-700 text-white"
                      : "bg-white text-ink-800 hover:bg-brand-50 hover:text-brand-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[12px] font-extrabold text-ink-800">
          Property category
        </label>

        <select
          value={filters.category}
          onChange={(event) =>
            onFieldChange("category", event.target.value)
          }
          className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
        >
          <option value="">All categories</option>

          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-[12px] font-extrabold text-ink-800">
          Booking type
        </label>

        <div className="grid gap-2">
          {[
            { value: "", label: "All booking types" },
            { value: "ENTIRE_PROPERTY", label: "Entire property" },
            { value: "ROOM_WISE", label: "Room-wise booking" },
            { value: "BOTH", label: "Both options" },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                filters.bookingType === option.value
                  ? "border-brand-400 bg-brand-50 text-brand-800"
                  : "border-ink-100 bg-white text-ink-700 hover:border-brand-200"
              }`}
            >
              <input
                type="radio"
                name="bookingType"
                checked={filters.bookingType === option.value}
                onChange={() =>
                  onFieldChange(
                    "bookingType",
                    option.value as PropertyBookingFilter
                  )
                }
                className="accent-brand-700"
              />

              <span className="font-semibold">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[12px] font-extrabold text-ink-800">
          Stay dates
        </label>

        <div className="grid gap-3">
          <label>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">
              Check-in
            </span>

            <input
              type="date"
              min={minimumDate}
              value={filters.checkIn}
              onChange={(event) => {
                const nextCheckIn = event.target.value;

                onFieldChange("checkIn", nextCheckIn);

                if (
                  filters.checkOut &&
                  nextCheckIn >= filters.checkOut
                ) {
                  onFieldChange("checkOut", "");
                }
              }}
              className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">
              Check-out
            </span>

            <input
              type="date"
              min={filters.checkIn || minimumDate}
              value={filters.checkOut}
              onChange={(event) =>
                onFieldChange("checkOut", event.target.value)
              }
              className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </label>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[12px] font-extrabold text-ink-800">
          Guests and rooms
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">
              Guests
            </span>

            <select
              value={filters.guests}
              onChange={(event) =>
                onFieldChange("guests", event.target.value)
              }
              className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            >
              {Array.from({ length: 20 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">
              Rooms
            </span>

            <select
              value={filters.rooms}
              onChange={(event) =>
                onFieldChange("rooms", event.target.value)
              }
              className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                )
              )}
            </select>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[12px] font-extrabold text-ink-800">
          Price per night
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">
              Minimum
            </span>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="100"
                value={filters.minimumPrice}
                onChange={(event) =>
                  onFieldChange("minimumPrice", event.target.value)
                }
                placeholder="0"
                className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3 text-sm text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </label>

          <label>
            <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">
              Maximum
            </span>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">
                ₹
              </span>

              <input
                type="number"
                min="0"
                step="100"
                value={filters.maximumPrice}
                onChange={(event) =>
                  onFieldChange("maximumPrice", event.target.value)
                }
                placeholder="Any"
                className="h-11 w-full rounded-lg border border-ink-200 bg-white pl-8 pr-3 text-sm text-ink-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              />
            </div>
          </label>
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50 px-4 py-3">
        <span>
          <strong className="block text-sm text-ink-800">
            Featured properties
          </strong>
          <small className="mt-0.5 block text-[11px] text-ink-500">
            Show only handpicked stays
          </small>
        </span>

        <input
          type="checkbox"
          checked={filters.featured}
          onChange={(event) =>
            onFieldChange("featured", event.target.checked)
          }
          className="h-5 w-5 accent-brand-700"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClear}
          className="h-11 rounded-lg border border-ink-200 bg-white text-sm font-extrabold text-ink-700 transition hover:border-brand-300 hover:text-brand-700"
        >
          Clear All
        </button>

        <button
          type="submit"
          className="h-11 rounded-lg bg-brand-700 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-800"
        >
          Apply Filters
        </button>
      </div>
    </form>
  );
}

export default function PropertyListingClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const currentSearchParams = useMemo(
    () => new URLSearchParams(queryString),
    [queryString]
  );

  const [filters, setFilters] = useState<FilterFormState>(() =>
    getInitialFilters(currentSearchParams)
  );
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [cities, setCities] = useState<PublicServiceCity[]>([]);
  const [properties, setProperties] = useState<PublicPropertyCard[]>([]);
  const [pagination, setPagination] = useState<
    PublicPropertiesResponse["pagination"]
  >({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const minimumDate = useMemo(() => localDateKey(new Date()), []);

  useEffect(() => {
    setFilters(getInitialFilters(currentSearchParams));
  }, [currentSearchParams]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3500);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadListing = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const apiQuery = buildApiQuery(currentSearchParams);

      const [
        categoriesResponse,
        citiesResponse,
        propertiesResponse,
      ] = await Promise.all([
        apiFetch<PublicCategoriesResponse>(
          "/public/property-categories"
        ),
        apiFetch<PublicServiceCitiesResponse>(
          "/public/service-cities"
        ),
        apiFetch<PublicPropertiesResponse>(
          `/public/properties?${apiQuery}`
        ),
      ]);

      setCategories(categoriesResponse.data || []);
      setCities(citiesResponse.data || []);
      setProperties(propertiesResponse.data || []);
      setPagination(propertiesResponse.pagination);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load properties."
      );
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [currentSearchParams]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  const replaceQuery = (parameters: URLSearchParams) => {
    const nextQuery = parameters.toString();

    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const updateField = <Key extends keyof FilterFormState>(
    key: Key,
    value: FilterFormState[Key]
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Boolean(filters.checkIn) !== Boolean(filters.checkOut)) {
      setToast({
        message: "Please select both check-in and check-out dates.",
      });
      return;
    }

    if (
      filters.checkIn &&
      filters.checkOut &&
      filters.checkOut <= filters.checkIn
    ) {
      setToast({
        message: "Check-out date must be after check-in.",
      });
      return;
    }

    if (
      filters.minimumPrice &&
      filters.maximumPrice &&
      Number(filters.minimumPrice) > Number(filters.maximumPrice)
    ) {
      setToast({
        message: "Maximum price must be greater than minimum price.",
      });
      return;
    }

    const parameters = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (key === "featured") {
        if (value === true) {
          parameters.set(key, "true");
        }
        return;
      }

      if (typeof value === "string" && value.trim()) {
        parameters.set(key, value.trim());
      }
    });

    const currentSort = currentSearchParams.get("sort");

    if (currentSort) {
      parameters.set("sort", currentSort);
    }

    parameters.set("page", "1");
    replaceQuery(parameters);
    setMobileFiltersOpen(false);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);

    const parameters = new URLSearchParams();
    const currentSort = currentSearchParams.get("sort");

    if (currentSort && currentSort !== "RECOMMENDED") {
      parameters.set("sort", currentSort);
    }

    replaceQuery(parameters);
    setMobileFiltersOpen(false);
  };

  const changeSort = (sort: PropertySort) => {
    const parameters = new URLSearchParams(currentSearchParams);

    parameters.set("sort", sort);
    parameters.set("page", "1");
    replaceQuery(parameters);
  };

  const changePage = (page: number) => {
    const parameters = new URLSearchParams(currentSearchParams);

    parameters.set("page", String(page));
    replaceQuery(parameters);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const summaryParts = useMemo(() => {
    const parts: string[] = [];
    const cityName = currentSearchParams.get("city");

    if (cityName) {
      const city = cities.find(
        (item) => item.name === cityName
      );

      parts.push(
        city
          ? `${city.name}, ${city.state}`
          : cityName
      );
    }

    const categorySlug = currentSearchParams.get("category");
    const category = categories.find(
      (item) => item.slug === categorySlug || item.id === categorySlug
    );

    if (category) {
      parts.push(category.name);
    }

    const checkIn = currentSearchParams.get("checkIn");
    const checkOut = currentSearchParams.get("checkOut");

    if (checkIn && checkOut) {
      const formatter = new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
      });

      parts.push(
        `${formatter.format(new Date(`${checkIn}T00:00:00`))} – ${formatter.format(
          new Date(`${checkOut}T00:00:00`)
        )}`
      );
    }

    const guests = currentSearchParams.get("guests");
    const rooms = currentSearchParams.get("rooms");

    if (guests) {
      parts.push(getNumberLabel(guests, "guest", "guests"));
    }

    if (rooms) {
      parts.push(getNumberLabel(rooms, "room", "rooms"));
    }

    return parts;
  }, [categories, cities, currentSearchParams]);

  const activeFilterCount = useMemo(() => {
    const ignored = new Set(["page", "limit", "sort"]);

    return Array.from(currentSearchParams.entries()).filter(
      ([key, value]) => !ignored.has(key) && Boolean(value)
    ).length;
  }, [currentSearchParams]);

  const currentSort = (currentSearchParams.get("sort") ||
    "RECOMMENDED") as PropertySort;

  return (
    <div className="min-h-[70vh] bg-[#f8faf8]">
      {toast && (
        <div className="fixed right-4 top-24 z-[100] flex max-w-sm items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-xl">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-bold text-white">
            !
          </span>
          <p className="text-sm font-semibold">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto opacity-70"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <section className="border-b border-ink-100 bg-white">
        <div className="site-container py-8 sm:py-10">
          <nav className="flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
            <Link href="/" className="font-semibold hover:text-brand-700">
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-ink-800">Properties</span>
          </nav>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-700">
                Verified stays
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink-900 sm:text-4xl">
                Find your perfect stay
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">
                Explore verified farmhouses, villas, resorts, homestays and
                nature retreats suited to your dates and group size.
              </p>

              {summaryParts.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {summaryParts.map((part) => (
                    <span
                      key={part}
                      className="rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700"
                    >
                      {part}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-brand-300 bg-brand-50 px-5 text-sm font-extrabold text-brand-700 hover:bg-brand-100"
            >
              Modify Home Search
            </Link>
          </div>
        </div>
      </section>

      <div className="site-container grid items-start gap-6 py-7 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-9">
        <aside className="sticky top-[92px] hidden rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_10px_32px_rgba(27,58,39,0.06)] lg:block">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-ink-900">Filters</h2>
              <p className="mt-1 text-[11px] text-ink-500">
                Refine your search
              </p>
            </div>

            {activeFilterCount > 0 && (
              <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand-700 px-2 text-xs font-extrabold text-white">
                {activeFilterCount}
              </span>
            )}
          </div>

          <FilterPanel
            filters={filters}
            categories={categories}
            cities={cities}
            minimumDate={minimumDate}
            onFieldChange={updateField}
            onApply={applyFilters}
            onClear={clearFilters}
          />
        </aside>

        <main className="min-w-0">
          <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-[0_8px_28px_rgba(27,58,39,0.05)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="block text-base font-extrabold text-ink-900">
                  {loading
                    ? "Searching properties..."
                    : `${pagination.total} ${
                        pagination.total === 1 ? "property" : "properties"
                      } found`}
                </strong>
                <span className="mt-1 block text-[12px] text-ink-500">
                  Prices shown are starting prices per night.
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 lg:hidden"
                >
                  <FilterIcon />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[10px] text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <select
                  value={currentSort}
                  onChange={(event) =>
                    changeSort(event.target.value as PropertySort)
                  }
                  className="h-11 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 sm:min-w-52"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {error && !loading && (
            <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-lg font-extrabold text-red-800">
                Unable to load properties
              </h2>
              <p className="mt-2 text-sm leading-6 text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadListing()}
                className="mt-4 h-10 rounded-lg bg-red-600 px-4 text-sm font-extrabold text-white"
              >
                Try Again
              </button>
            </section>
          )}

          {loading && (
            <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-ink-100 bg-white"
                >
                  <div className="h-52 animate-pulse bg-ink-100" />
                  <div className="space-y-3 p-4">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-ink-100" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-ink-100" />
                    <div className="h-10 animate-pulse rounded bg-ink-100" />
                  </div>
                </div>
              ))}
            </section>
          )}

          {!loading && !error && properties.length > 0 && (
            <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard
                  key={property.publicId}
                  property={property}
                  href={buildPropertyHref(
                    property.publicId,
                    currentSearchParams
                  )}
                />
              ))}
            </section>
          )}

          {!loading && !error && properties.length === 0 && (
            <section className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-700">
                <SearchIcon />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold text-ink-900">
                No matching stays found
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-500">
                Try changing the dates, destination, booking type or price
                range. Availability is checked when both dates are selected.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 h-11 rounded-lg bg-brand-700 px-5 text-sm font-extrabold text-white"
              >
                Clear All Filters
              </button>
            </section>
          )}

          {!loading && !error && pagination.totalPages > 1 && (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => changePage(pagination.page - 1)}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeftIcon />
                Previous
              </button>

              {Array.from(
                { length: pagination.totalPages },
                (_, index) => index + 1
              )
                .filter(
                  (page) =>
                    page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - pagination.page) <= 1
                )
                .map((page, index, array) => {
                  const previousPage = array[index - 1];

                  return (
                    <span key={page} className="contents">
                      {previousPage && page - previousPage > 1 && (
                        <span className="px-1 text-ink-400">…</span>
                      )}

                      <button
                        type="button"
                        onClick={() => changePage(page)}
                        className={`grid h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-extrabold ${
                          page === pagination.page
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700"
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  );
                })}

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => changePage(pagination.page + 1)}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-sm font-bold text-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRightIcon />
              </button>
            </nav>
          )}
        </main>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filter drawer"
          />

          <aside className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-ink-900">
                  Search Filters
                </h2>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  Find your ideal stay
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-ink-200 text-ink-700"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="p-5">
              <FilterPanel
                filters={filters}
                categories={categories}
                cities={cities}
                minimumDate={minimumDate}
                onFieldChange={updateField}
                onApply={applyFilters}
                onClear={clearFilters}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

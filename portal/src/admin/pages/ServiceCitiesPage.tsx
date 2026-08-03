import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import api from "../../shared/api/api";

interface ServiceCity {
  id: string;
  name: string;
  state: string;
  country: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ServiceCityResponse {
  success: boolean;
  message: string;
  data: ServiceCity[];
  total: number;
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string>;
}

interface CityFormState {
  name: string;
  state: string;
  country: string;
  isActive: boolean;
  sortOrder: string;
}

type CityFilter = "all" | "active" | "inactive";

const emptyForm: CityFormState = {
  name: "",
  state: "",
  country: "India",
  isActive: true,
  sortOrder: "0",
};

const inputClass =
  "h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none transition placeholder:text-text-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

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

export default function ServiceCitiesPage() {
  const [cities, setCities] = useState<ServiceCity[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<CityFilter>("all");
  const [form, setForm] =
    useState<CityFormState>(emptyForm);
  const [editingCity, setEditingCity] =
    useState<ServiceCity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get<ServiceCityResponse>(
          "/admin/service-cities",
          {
            params: {
              search: search || undefined,
              status,
            },
          }
        );

      setCities(response.data.data);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to fetch service cities."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  const activeCount = useMemo(
    () =>
      cities.filter((city) => city.isActive)
        .length,
    [cities]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCity(null);
    setError("");
  };

  const startEdit = (city: ServiceCity) => {
    setEditingCity(city);
    setForm({
      name: city.name,
      state: city.state,
      country: city.country,
      isActive: city.isActive,
      sortOrder: String(city.sortOrder),
    });
    setMessage("");
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const saveCity = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        name: form.name.trim(),
        state: form.state.trim(),
        country: form.country.trim() || "India",
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (editingCity) {
        await api.put(
          `/admin/service-cities/${editingCity.id}`,
          payload
        );
        setMessage("City updated successfully.");
      } else {
        await api.post(
          "/admin/service-cities",
          payload
        );
        setMessage("City added successfully.");
      }

      resetForm();
      await loadCities();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to save city."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (city: ServiceCity) => {
    try {
      setError("");
      setMessage("");

      await api.patch(
        `/admin/service-cities/${city.id}/status`,
        {
          isActive: !city.isActive,
        }
      );

      setMessage(
        !city.isActive
          ? "City activated successfully."
          : "City deactivated successfully."
      );
      await loadCities();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to update city status."
        )
      );
    }
  };

  const deleteCity = async (city: ServiceCity) => {
    if (
      !window.confirm(
        `Delete ${city.name}, ${city.state}?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await api.delete(
        `/admin/service-cities/${city.id}`
      );

      setMessage("City deleted successfully.");
      await loadCities();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to delete city."
        )
      );
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">
              Service Area
            </p>
            <h1 className="mt-1 text-ui-xl font-extrabold text-text-main">
              Service Cities
            </h1>
            <p className="mt-1 text-ui-sm text-text-muted">
              Vendors can list properties only in active cities configured here.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-control border border-border bg-surface-soft px-4 py-3">
              <span className="block text-[10px] font-bold uppercase text-text-muted">
                Total
              </span>
              <strong className="text-lg text-text-main">
                {cities.length}
              </strong>
            </div>
            <div className="rounded-control border border-primary-100 bg-primary-50 px-4 py-3">
              <span className="block text-[10px] font-bold uppercase text-primary-700">
                Active
              </span>
              <strong className="text-lg text-primary-800">
                {activeCount}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {(message || error) && (
        <div
          className={`rounded-control border px-4 py-3 text-sm font-bold ${
            error
              ? "border-danger/20 bg-danger-soft text-danger"
              : "border-success/20 bg-success-soft text-success"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={saveCity}
          className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card"
        >
          <h2 className="text-base font-extrabold text-text-main">
            {editingCity ? "Edit City" : "Add City"}
          </h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                City
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Example: Indore"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                State
              </span>
              <input
                value={form.state}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="Example: Madhya Pradesh"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Country
              </span>
              <input
                value={form.country}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    country: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="India"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-text-secondary">
                Sort Order
              </span>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </label>

            <label className="flex items-center justify-between rounded-control border border-border bg-surface-soft px-4 py-3">
              <span className="text-sm font-bold text-text-secondary">
                Active
              </span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-primary-700"
              />
            </label>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-control bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingCity
                  ? "Update City"
                  : "Add City"}
            </button>

            {editingCity && (
              <button
                type="button"
                onClick={resetForm}
                className="h-11 rounded-control border border-border px-4 text-sm font-bold text-text-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search city, state, country..."
              className={inputClass}
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as CityFilter
                )
              }
              className="h-11 rounded-control border border-border bg-surface px-3.5 text-sm font-bold text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-5 overflow-hidden rounded-control border border-border">
            <table className="min-w-full divide-y divide-border text-left text-sm">
              <thead className="bg-surface-soft text-xs uppercase tracking-[0.08em] text-text-muted">
                <tr>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-text-muted"
                    >
                      Loading cities...
                    </td>
                  </tr>
                ) : cities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-text-muted"
                    >
                      No cities found.
                    </td>
                  </tr>
                ) : (
                  cities.map((city) => (
                    <tr key={city.id}>
                      <td className="px-4 py-3 font-bold text-text-main">
                        {city.name}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {city.state}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {city.country}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${
                            city.isActive
                              ? "bg-success-soft text-success"
                              : "bg-surface-soft text-text-muted"
                          }`}
                        >
                          {city.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(city)}
                            className="h-9 rounded-control border border-border px-3 text-xs font-bold text-text-secondary hover:bg-surface-soft"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(city)
                            }
                            className="h-9 rounded-control border border-primary-100 px-3 text-xs font-bold text-primary-700 hover:bg-primary-50"
                          >
                            {city.isActive
                              ? "Disable"
                              : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              deleteCity(city)
                            }
                            className="h-9 rounded-control border border-danger/20 px-3 text-xs font-bold text-danger hover:bg-danger-soft"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </div>
  );
}

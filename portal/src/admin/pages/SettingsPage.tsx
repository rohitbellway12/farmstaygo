import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import api from "../../shared/api/api";
import {
  fetchContactSettings,
  fetchPaymentSettings,
  fetchPlatformSettings,
  fetchMapSettings,
  fetchHomeSettings,
  updateContactSettings,
  updatePaymentSettings,
  updatePlatformSettings,
  updateMapSettings,
  updateHomeSettings,
} from "../../shared/api/contactApi";

import type {
  ContactSettings,
  SocialLink,
  MapSettings,
} from "../../shared/api/contactApi";

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[] | string>;
}

type Tab = "contact" | "platform" | "payment" | "map" | "service-cities" | "home";

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

const emptySocialLink: SocialLinkForm = {
  platform: "",
  url: "",
  isActive: true,
  sortOrder: 0,
};

interface SocialLinkForm {
  platform: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] =
    useState<Tab>("contact");

  const [contactSettings, setContactSettings] =
    useState<ContactSettings | null>(null);
  const [serviceCities, setServiceCities] = useState<
    Array<{
      id: string;
      name: string;
      state: string;
      country: string;
      isActive: boolean;
    }>
  >([]);

  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingPlatform, setLoadingPlatform] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);

  const [savingContact, setSavingContact] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const [togglingCityId, setTogglingCityId] = useState<
    string | null
  >(null);

  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [socialLinks, setSocialLinks] = useState<
    SocialLinkForm[]
  >([emptySocialLink]);

  const [platformForm, setPlatformForm] = useState({
    siteName: "",
    siteLogoUrl: "",
    siteFaviconUrl: "",
    defaultCurrency: "INR",
    timezone: "Asia/Kolkata",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [faviconPreview, setFaviconPreview] = useState<string>("");

  const [paymentForm, setPaymentForm] = useState({
    paymentMethods: ["ONLINE"] as string[],
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookUrl: "",
  });

  const [mapForm, setMapForm] = useState<MapSettings>({
    mapProvider: "GOOGLE",
    mapApiKey: "",
  });

  const [loadingHome, setLoadingHome] = useState(true);
  const [savingHome, setSavingHome] = useState(false);

  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [growFile, setGrowFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string>("");
  const [growPreview, setGrowPreview] = useState<string>("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadContactSettings = useCallback(async () => {
    try {
      setLoadingContact(true);
      setPageError("");
      const response = await fetchContactSettings();
      setContactSettings(response.data);
      setSocialLinks(
        response.data.socialLinks.length > 0
          ? response.data.socialLinks.map(
              (link) => ({
                platform: link.platform,
                url: link.url,
                isActive: link.isActive,
                sortOrder: link.sortOrder,
              })
            )
          : [emptySocialLink]
      );
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load contact settings."
        )
      );
    } finally {
      setLoadingContact(false);
    }
  }, []);

  const loadPlatformSettings = useCallback(async () => {
    try {
      setLoadingPlatform(true);
      setPageError("");
      const response = await fetchPlatformSettings();
      const data = response.data;
      setPlatformForm({
        siteName: data.siteName,
        siteLogoUrl: data.siteLogoUrl || "",
        siteFaviconUrl: data.siteFaviconUrl || "",
        defaultCurrency: data.defaultCurrency,
        timezone: data.timezone,
      });
      setLogoPreview(data.siteLogoUrl || "");
      setFaviconPreview(data.siteFaviconUrl || "");
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load platform settings."
        )
      );
    } finally {
      setLoadingPlatform(false);
    }
  }, []);

  const loadPaymentSettings = useCallback(async () => {
    try {
      setLoadingPayment(true);
      setPageError("");
      const response = await fetchPaymentSettings();
      const data = response.data;
      setPaymentForm({
        paymentMethods: data.paymentMethods,
        razorpayKeyId: data.razorpayKeyId || "",
        razorpayKeySecret: data.razorpayKeySecret || "",
        razorpayWebhookUrl: data.razorpayWebhookUrl || "",
      });
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load payment settings."
        )
      );
    } finally {
      setLoadingPayment(false);
    }
  }, []);

  const loadMapSettings = useCallback(async () => {
    try {
      setLoadingMap(true);
      setPageError("");
      const response = await fetchMapSettings();
      const data = response.data;
      setMapForm({
        mapProvider: data.mapProvider,
        mapApiKey: data.mapApiKey || "",
      });
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load map settings."
        )
      );
    } finally {
      setLoadingMap(false);
    }
  }, []);

  const loadHomeSettings = useCallback(async () => {
    try {
      setLoadingHome(true);
      setPageError("");
      const response = await fetchHomeSettings();
      const data = response.data;
      setHeroPreview(data.homeHeroImage || "");
      setGrowPreview(data.homeGrowImage || "");
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load home page settings."
        )
      );
    } finally {
      setLoadingHome(false);
    }
  }, []);

  const loadServiceCities = useCallback(async () => {
    try {
      setLoadingCities(true);
      setPageError("");
      const response = await api.get<{
        success: boolean;
        data: Array<{
          id: string;
          name: string;
          state: string;
          country: string;
          isActive: boolean;
        }>;
      }>("/admin/service-cities");

      setServiceCities(response.data.data);
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load service cities."
        )
      );
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    void loadContactSettings();
  }, [loadContactSettings]);

  useEffect(() => {
    void loadPlatformSettings();
  }, [loadPlatformSettings]);

  useEffect(() => {
    void loadPaymentSettings();
  }, [loadPaymentSettings]);

  useEffect(() => {
    if (activeTab === "map") {
      void loadMapSettings();
    }
  }, [activeTab, loadMapSettings]);

  useEffect(() => {
    if (activeTab === "home") {
      void loadHomeSettings();
    }
  }, [activeTab, loadHomeSettings]);

  useEffect(() => {
    if (activeTab === "service-cities") {
      void loadServiceCities();
    }
  }, [activeTab, loadServiceCities]);

  const updateSocialLinkField = (
    index: number,
    field: keyof SocialLinkForm,
    value: unknown
  ) => {
    const newLinks = [...socialLinks];
    (newLinks[index] as unknown as Record<
      string,
      unknown
    >)[field] = value;
    setSocialLinks(newLinks);
  };

  const addSocialLink = () => {
    setSocialLinks([
      ...socialLinks,
      emptySocialLink,
    ]);
  };

  const removeSocialLink = (index: number) => {
    if (socialLinks.length <= 1) return;
    const newLinks = [...socialLinks];
    newLinks.splice(index, 1);
    setSocialLinks(newLinks);
  };

  const handleSaveContact = async () => {
    if (!contactSettings) return;
    setSavingContact(true);
    setPageError("");

    try {
      const response = await updateContactSettings({
        contactEmail: contactSettings.contactEmail,
        contactPhone: contactSettings.contactPhone,
        socialLinks: socialLinks.filter(
          (link) =>
            link.platform &&
            link.platform.trim() &&
            link.url &&
            link.url.trim()
        ) as SocialLink[],
      });

      setContactSettings(response.data);
      setSocialLinks(
        response.data.socialLinks.length > 0
          ? response.data.socialLinks.map(
              (link) => ({
                platform: link.platform,
                url: link.url,
                isActive: link.isActive,
                sortOrder: link.sortOrder,
              })
            )
          : [emptySocialLink]
      );
      setToast({
        type: "success",
        message:
          "Contact settings updated successfully.",
      });
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to save contact settings."
        )
      );
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to save contact settings."
        ),
      });
    } finally {
      setSavingContact(false);
    }
  };

  const handleSavePlatform = async () => {
    setSavingPlatform(true);
    setPageError("");

    try {
      const formData = new FormData();
      formData.append("siteName", platformForm.siteName);
      formData.append("defaultCurrency", platformForm.defaultCurrency);
      formData.append("timezone", platformForm.timezone);
      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (faviconFile) {
        formData.append("favicon", faviconFile);
      }

      const response = await updatePlatformSettings(formData);
      setPlatformForm({
        siteName: response.data.siteName,
        siteLogoUrl: response.data.siteLogoUrl || "",
        siteFaviconUrl: response.data.siteFaviconUrl || "",
        defaultCurrency: response.data.defaultCurrency,
        timezone: response.data.timezone,
      });
      setLogoPreview(response.data.siteLogoUrl || "");
      setFaviconPreview(response.data.siteFaviconUrl || "");
      setLogoFile(null);
      setFaviconFile(null);
      setToast({
        type: "success",
        message:
          "Platform settings updated successfully.",
      });
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to save platform settings."
        )
      );
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to save platform settings."
        ),
      });
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleSavePayment = async () => {
    setSavingPayment(true);
    setPageError("");

    try {
      await updatePaymentSettings({
        ...paymentForm,
      } as Parameters<typeof updatePaymentSettings>[0]);
      setToast({
        type: "success",
        message:
          "Payment settings updated successfully.",
      });
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to save payment settings."
        )
      );
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to save payment settings."
        ),
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSaveMap = async () => {
    setSavingMap(true);
    setPageError("");

    try {
      await updateMapSettings({
        mapProvider: mapForm.mapProvider,
        mapApiKey: mapForm.mapApiKey || null,
      });
      setToast({
        type: "success",
        message:
          "Map settings updated successfully.",
      });
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to save map settings."
        )
      );
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to save map settings."
        ),
      });
    } finally {
      setSavingMap(false);
    }
  };

  const handleSaveHome = async () => {
    setSavingHome(true);
    setPageError("");

    try {
      const formData = new FormData();
      if (heroFile) {
        formData.append("hero", heroFile);
      }
      if (growFile) {
        formData.append("grow", growFile);
      }

      const response = await updateHomeSettings(formData);
      setHeroPreview(response.data.homeHeroImage || "");
      setGrowPreview(response.data.homeGrowImage || "");
      setHeroFile(null);
      setGrowFile(null);
      setToast({
        type: "success",
        message:
          "Home page images updated successfully.",
      });
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to save home page images."
        )
      );
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to save home page images."
        ),
      });
    } finally {
      setSavingHome(false);
    }
  };

  const togglePaymentMethod = (method: string) => {
    setPaymentForm((current) => ({
      ...current,
      paymentMethods: current.paymentMethods.includes(
        method
      )
        ? current.paymentMethods.filter(
            (m) => m !== method
          )
        : [...current.paymentMethods, method],
    }));
  };

  const toggleCityStatus = async (
    city: { id: string; isActive: boolean }
  ) => {
    setTogglingCityId(city.id);
    try {
      await api.patch(
        `/admin/service-cities/${city.id}/status`,
        { isActive: !city.isActive }
      );
      setServiceCities((current) =>
        current.map((c) =>
          c.id === city.id
            ? { ...c, isActive: !c.isActive }
            : c
        )
      );
      setToast({
        type: "success",
        message: !city.isActive
          ? "City activated successfully."
          : "City deactivated successfully.",
      });
    } catch {
      setToast({
        type: "error",
        message:
          "Unable to update city status.",
      });
    } finally {
      setTogglingCityId(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "contact", label: "Contact" },
    { key: "platform", label: "Platform" },
    { key: "payment", label: "Payment" },
    { key: "map", label: "Map" },
    { key: "home", label: "Home Page" },
    {
      key: "service-cities",
      label: "Service Cities",
    },
  ];

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed right-5 top-20 z-[90] flex max-w-sm items-start gap-3 rounded-dashboard-card border px-4 py-3 shadow-dashboard-dropdown ${
            toast.type === "success"
              ? "border-success/20 bg-success-soft text-success"
              : "border-danger/20 bg-danger-soft text-danger"
          }`}
        >
          <span
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${
              toast.type === "success"
                ? "bg-success"
                : "bg-danger"
            }`}
          >
            {toast.type === "success" ? "✓" : "!"}
          </span>
          <p className="text-sm font-semibold">
            {toast.message}
          </p>
        </div>
      )}

      <section className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-7h6v7" />
          </svg>
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-text-main">
            Settings
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage platform, payment, and service
            configuration.
          </p>
        </div>
      </section>

      <div className="flex gap-1 rounded-control border border-border bg-surface-soft p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`h-10 flex-1 rounded-control text-sm font-bold transition ${
              activeTab === tab.key
                ? "bg-surface text-text-main shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pageError && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {pageError}
        </div>
      )}

      {activeTab === "contact" && (
        <section className="space-y-6 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Contact Information
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              These details appear on the website contact
              page and footer. Contact form submissions
              are sent to this email.
            </p>
          </div>

          {loadingContact ? (
            <div className="text-sm font-bold text-text-muted">
              Loading contact settings...
            </div>
          ) : contactSettings ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                  Contact Email
                  <input
                    type="email"
                    value={
                      contactSettings.contactEmail ?? ""
                    }
                    onChange={(e) =>
                      setContactSettings(
                        (prev) =>
                          prev
                            ? {
                                ...prev,
                                contactEmail:
                                  e.target.value || null,
                              }
                            : null
                      )
                    }
                    placeholder="admin@farmstaygo.com"
                    className={inputClass}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                  Contact Phone
                  <input
                    type="tel"
                    value={
                      contactSettings.contactPhone ?? ""
                    }
                    onChange={(e) =>
                      setContactSettings(
                        (prev) =>
                          prev
                            ? {
                                ...prev,
                                contactPhone:
                                  e.target.value || null,
                              }
                            : null
                      )
                    }
                    placeholder="+91 9876543210"
                    className={inputClass}
                  />
                </label>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-text-main">
                  Social Links
                </h3>

                <div className="mt-3 space-y-3">
                  {socialLinks.map(
                    (link, index) => (
                      <div
                        key={index}
                        className="flex items-end gap-3"
                      >
                        <label className="flex-1 text-xs font-extrabold text-text-secondary">
                          Platform
                          <input
                            type="text"
                            value={link.platform ?? ""}
                            onChange={(e) =>
                              updateSocialLinkField(
                                index,
                                "platform",
                                e.target.value
                              )
                            }
                            placeholder="e.g. Facebook"
                            className={inputClass}
                          />
                        </label>

                        <label className="flex-1 text-xs font-extrabold text-text-secondary">
                          URL
                          <input
                            type="url"
                            value={link.url ?? ""}
                            onChange={(e) =>
                              updateSocialLinkField(
                                index,
                                "url",
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                            className={inputClass}
                          />
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary">
                          <input
                            type="checkbox"
                            checked={link.isActive ?? true}
                            onChange={(e) =>
                              updateSocialLinkField(
                                index,
                                "isActive",
                                e.target.checked
                              )
                            }
                          />
                          Active
                        </label>

                        {socialLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeSocialLink(index)
                            }
                            className="rounded-lg border border-danger/30 bg-surface px-3 py-2 text-xs font-bold text-danger hover:bg-danger-soft"
                            title="Remove"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={addSocialLink}
                  className="mt-4 rounded-control border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary hover:bg-surface-muted"
                >
                  Add Social Link
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveContact}
                  disabled={savingContact}
                  className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
                >
                  {savingContact
                    ? "Saving..."
                    : "Save Contact Settings"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm font-bold text-text-muted">
              Unable to load contact settings.
            </div>
          )}
        </section>
      )}

      {activeTab === "platform" && (
        <section className="space-y-6 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Platform Settings
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Configure your platform brand, currency, and
              timezone.
            </p>
          </div>

          {loadingPlatform ? (
            <div className="text-sm font-bold text-text-muted">
              Loading platform settings...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Site Name *
                <input
                  type="text"
                  value={platformForm.siteName}
                  onChange={(e) =>
                    setPlatformForm(
                      (current) => ({
                        ...current,
                        siteName: e.target.value,
                      })
                    )
                  }
                  placeholder="FarmStay"
                  className={inputClass}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Site Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                      setLogoPreview(
                        URL.createObjectURL(file)
                      );
                    }
                  }}
                  className={inputClass}
                />
                {logoPreview && (
                  <div className="mt-2">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-12 w-auto rounded border border-border bg-white object-contain"
                    />
                  </div>
                )}
                <p className="text-[11px] text-text-soft">
                  Upload a new logo image. Recommended size: 200x50px. Max 2MB.
                </p>
              </label>

              <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Favicon
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFaviconFile(file);
                      setFaviconPreview(
                        URL.createObjectURL(file)
                      );
                    }
                  }}
                  className={inputClass}
                />
                {faviconPreview && (
                  <div className="mt-2">
                    <img
                      src={faviconPreview}
                      alt="Favicon preview"
                      className="h-10 w-10 rounded border border-border bg-white object-contain"
                    />
                  </div>
                )}
                <p className="text-[11px] text-text-soft">
                  Upload a new favicon image. Recommended size: 32x32px or 64x64px. Max 2MB.
                </p>
              </label>

              <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Default Currency
                <select
                  value={platformForm.defaultCurrency}
                  onChange={(e) =>
                    setPlatformForm(
                      (current) => ({
                        ...current,
                        defaultCurrency: e.target.value,
                      })
                    )
                  }
                  className={inputClass}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Timezone
                <input
                  type="text"
                  value={platformForm.timezone}
                  onChange={(e) =>
                    setPlatformForm(
                      (current) => ({
                        ...current,
                        timezone: e.target.value,
                      })
                    )
                  }
                  placeholder="Asia/Kolkata"
                  className={inputClass}
                />
              </label>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSavePlatform}
              disabled={savingPlatform}
              className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {savingPlatform
                ? "Saving..."
                : "Save Platform Settings"}
            </button>
          </div>
        </section>
      )}

      {activeTab === "home" && (
        <section className="space-y-6 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Home Page Images
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Manage the hero banner and the "Grow with
              FarmStayGo" section image shown on the public
              website. Oversized images are automatically
              cropped to the correct size.
            </p>
          </div>

          {loadingHome ? (
            <div className="text-sm font-bold text-text-muted">
              Loading home page settings...
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Hero Banner Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setHeroFile(file);
                      setHeroPreview(
                        URL.createObjectURL(file)
                      );
                    }
                  }}
                  className={inputClass}
                />
                {heroPreview && (
                  <div className="mt-2 overflow-hidden rounded border border-border">
                    <img
                      src={heroPreview}
                      alt="Hero preview"
                      className="h-32 w-full object-cover"
                    />
                  </div>
                )}
                <p className="text-[11px] text-text-soft">
                  Shown as the home page hero background.
                  Recommended: 1920x1080px. Max 5MB. JPG,
                  PNG or WEBP.
                </p>
              </label>

              <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Grow Section Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setGrowFile(file);
                      setGrowPreview(
                        URL.createObjectURL(file)
                      );
                    }
                  }}
                  className={inputClass}
                />
                {growPreview && (
                  <div className="mt-2 overflow-hidden rounded border border-border">
                    <img
                      src={growPreview}
                      alt="Grow section preview"
                      className="h-32 w-full object-cover"
                    />
                  </div>
                )}
                <p className="text-[11px] text-text-soft">
                  Shown in the "Grow with FarmStayGo" section.
                  Recommended: 1000x800px. Max 5MB. JPG,
                  PNG or WEBP.
                </p>
              </label>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveHome}
              disabled={savingHome}
              className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {savingHome
                ? "Saving..."
                : "Save Home Page Images"}
            </button>
          </div>
        </section>
      )}

      {activeTab === "payment" && (
        <section className="space-y-6 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Payment Settings
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Configure payment methods and Razorpay
              gateway credentials.
            </p>
          </div>

          {loadingPayment ? (
            <div className="text-sm font-bold text-text-muted">
              Loading payment settings...
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-extrabold text-text-main">
                  Payment Methods
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  Enable the payment methods you want to
                  accept from guests.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[
                    {
                      value: "ONLINE",
                      label: "Online Payment",
                    },
                    {
                      value: "CASH",
                      label: "Cash",
                    },
                    {
                      value: "BANK_TRANSFER",
                      label: "Bank Transfer",
                    },
                  ].map((method) => (
                    <label
                      key={method.value}
                      className="flex items-center gap-2 rounded-control border border-border bg-surface-soft px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={paymentForm.paymentMethods.includes(
                          method.value
                        )}
                        onChange={() =>
                          togglePaymentMethod(
                            method.value
                          )
                        }
                        className="h-5 w-5 accent-primary-700"
                      />
                      <span className="text-sm font-bold text-text-main">
                        {method.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-text-main">
                  Razorpay Configuration
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  Enter your Razorpay dashboard credentials.
                  Leave blank to use sandbox mode.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                    Razorpay Key ID
                    <input
                      type="text"
                      value={paymentForm.razorpayKeyId}
                      onChange={(e) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            razorpayKeyId: e.target.value,
                          })
                        )
                      }
                      placeholder="rzp_test_..."
                      className={inputClass}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
                    Razorpay Key Secret
                    <input
                      type="password"
                      value={paymentForm.razorpayKeySecret}
                      onChange={(e) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            razorpayKeySecret: e.target.value,
                          })
                        )
                      }
                      placeholder="••••••••••••••••"
                      className={inputClass}
                    />
                  </label>

                  <label className="sm:col-span-2 grid gap-1.5 text-xs font-extrabold text-text-secondary">
                    Webhook URL
                    <input
                      type="url"
                      value={paymentForm.razorpayWebhookUrl}
                      onChange={(e) =>
                        setPaymentForm(
                          (current) => ({
                            ...current,
                            razorpayWebhookUrl: e.target.value,
                          })
                        )
                      }
                      placeholder="https://yourdomain.com/api/webhooks/razorpay"
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSavePayment}
              disabled={savingPayment}
              className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {savingPayment
                ? "Saving..."
                : "Save Payment Settings"}
            </button>
          </div>
        </section>
      )}

      {activeTab === "map" && (
        <section className="space-y-6 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Map Settings
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Configure the map provider and API key
              used for property location selection and
              public maps.
            </p>
          </div>

          {loadingMap ? (
            <div className="text-sm font-bold text-text-muted">
              Loading map settings...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Map Provider
                <select
                  value={mapForm.mapProvider}
                  onChange={(e) =>
                    setMapForm(
                      (current) => ({
                        ...current,
                        mapProvider: e.target.value,
                      })
                    )
                  }
                  className={inputClass}
                >
                  <option value="GOOGLE">
                    Google Maps
                  </option>
                </select>
                <p className="text-[11px] text-text-soft">
                  Google Maps is the only supported map provider. A valid Google Maps API key with Places and Maps APIs enabled is required.
                </p>
              </label>

              <label className="sm:col-span-2 grid gap-1.5 text-xs font-extrabold text-text-secondary">
                Google Maps API Key
                <input
                  type="text"
                  value={mapForm.mapApiKey ?? ""}
                  onChange={(e) =>
                    setMapForm(
                      (current) => ({
                        ...current,
                        mapApiKey: e.target.value,
                      })
                    )
                  }
                  placeholder="Enter your Google Maps API key"
                  className={inputClass}
                />
                <p className="text-[11px] text-text-soft">
                  Required for Google Maps. Enable Maps JavaScript API, Places API, and Directions API in your Google Cloud Console.
                </p>
              </label>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveMap}
              disabled={savingMap}
              className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {savingMap
                ? "Saving..."
                : "Save Map Settings"}
            </button>
          </div>
        </section>
      )}

      {activeTab === "service-cities" && (
        <section className="space-y-5 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-text-main">
                Service Cities
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Vendors can list properties only in active
                cities configured here.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="rounded-control border border-border bg-surface-soft px-4 py-3">
                <span className="block text-[10px] font-bold uppercase text-text-muted">
                  Total
                </span>
                <strong className="text-lg text-text-main">
                  {serviceCities.length}
                </strong>
              </div>
              <div className="rounded-control border border-primary-100 bg-primary-50 px-4 py-3">
                <span className="block text-[10px] font-bold uppercase text-primary-700">
                  Active
                </span>
                <strong className="text-lg text-primary-800">
                  {serviceCities.filter((c) => c.isActive).length}
                </strong>
              </div>
              <Link
                to="/admin/service-cities"
                className="inline-flex h-11 items-center justify-center rounded-control bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800"
              >
                Manage Cities
              </Link>
            </div>
          </div>

          {loadingCities ? (
            <div className="text-sm font-bold text-text-muted">
              Loading cities...
            </div>
          ) : (
            <div className="overflow-hidden rounded-control border border-border">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-surface-soft text-xs uppercase tracking-[0.08em] text-text-muted">
                  <tr>
                    <th className="px-4 py-3">
                      City
                    </th>
                    <th className="px-4 py-3">
                      State
                    </th>
                    <th className="px-4 py-3">
                      Country
                    </th>
                    <th className="px-4 py-3">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {serviceCities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-text-muted"
                      >
                        No cities found.
                      </td>
                    </tr>
                  ) : (
                    serviceCities.map(
                      (city) => (
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
                                onClick={() =>
                                  toggleCityStatus(
                                    city
                                  )
                                }
                                disabled={
                                  togglingCityId ===
                                  city.id
                                }
                                className="h-9 rounded-control border border-primary-100 px-3 text-xs font-bold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
                              >
                                {city.isActive
                                  ? "Disable"
                                  : "Enable"}
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
          )}
        </section>
      )}
    </div>
  );
}

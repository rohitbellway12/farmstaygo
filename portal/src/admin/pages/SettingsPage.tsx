import axios from "axios";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fetchContactSettings,
  updateContactSettings,
  type ContactSettings,
  type SocialLink,
} from "../../shared/api/contactApi";

interface ApiErrorResponse {
  message?: string;
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

const inputClass =
  "h-11 w-full rounded-control border border-border bg-surface px-3.5 text-sm text-text-main outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100";

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

const emptySocialLink = {
  platform: "",
  url: "",
  isActive: true,
  sortOrder: 0,
};

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<ContactSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] =
    useState("");
  const [toast, setToast] =
    useState<ToastState | null>(null);
  const [socialLinks, setSocialLinks] =
    useState<Partial<SocialLink>[]>([emptySocialLink]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await fetchContactSettings();
      setSettings(response.data);
      setSocialLinks(
        response.data.socialLinks.length > 0
          ? response.data.socialLinks
          : [emptySocialLink]
      );
    } catch (error) {
      setPageError(
        getApiErrorMessage(
          error,
          "Unable to load settings."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateSocialLinkField = (
    index: number,
    field: keyof SocialLink,
    value: unknown
  ) => {
    const newLinks = [...socialLinks];
    (newLinks[index] as Record<string, unknown>)[
      field
    ] = value;
    setSocialLinks(newLinks);
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, emptySocialLink]);
  };

  const removeSocialLink = (index: number) => {
    if (socialLinks.length <= 1) return;
    const newLinks = [...socialLinks];
    newLinks.splice(index, 1);
    setSocialLinks(newLinks);
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);

    try {
      const response = await updateContactSettings({
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        socialLinks: socialLinks.filter(
          (link) =>
            link.platform &&
            link.platform.trim() &&
            link.url &&
            link.url.trim()
        ),
      });

      setSettings(response.data);
      setToast({
        type: "success",
        message:
          "Contact settings updated successfully.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message: getApiErrorMessage(
          error,
          "Unable to save settings."
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const setField = (
    field: keyof ContactSettings,
    value: string | null
  ) => {
    if (!settings) return;
    setSettings((prev) => ({
      ...(prev as ContactSettings),
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <section className="rounded-dashboard-card border border-border bg-surface p-5 shadow-dashboard-card">
        <div className="text-sm font-bold text-text-muted">
          Loading settings...
        </div>
      </section>
    );
  }

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

      <section className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
              Manage platform contact configuration.
            </p>
          </div>
        </div>
      </section>

      {pageError && (
        <div className="rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
          {pageError}
        </div>
      )}

      {settings && (
        <section className="space-y-6 rounded-dashboard-card border border-border bg-surface p-6 shadow-dashboard-card">
          <div>
            <h2 className="text-lg font-extrabold text-text-main">
              Contact Information
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              These details appear on the website contact
              page and footer. Contact form submissions are
              sent to this email.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-extrabold text-text-secondary">
              Contact Email
              <input
                type="email"
                value={settings.contactEmail ?? ""}
                onChange={(e) =>
                  setField(
                    "contactEmail",
                    e.target.value || null
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
                value={settings.contactPhone ?? ""}
                onChange={(e) =>
                  setField(
                    "contactPhone",
                    e.target.value || null
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
        </section>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-11 rounded-control bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

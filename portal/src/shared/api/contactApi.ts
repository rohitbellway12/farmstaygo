import api from "./api";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSettings {
  contactEmail: string | null;
  contactPhone: string | null;
  socialLinks: SocialLink[];
}

export interface ContactMessagesResponse {
  success: boolean;
  message: string;
  data: ContactMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface ContactMessageResponse {
  success: boolean;
  message: string;
  data: ContactMessage;
}

export interface ContactSettingsResponse {
  success: boolean;
  message: string;
  data: ContactSettings;
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: { count: number };
}

export interface PlatformSettings {
  siteName: string;
  siteLogoUrl: string | null;
  siteFaviconUrl: string | null;
  defaultCurrency: string;
  timezone: string;
}

export interface PlatformSettingsResponse {
  success: boolean;
  message: string;
  data: PlatformSettings;
}

export interface PaymentSettings {
  paymentMethods: string[];
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  razorpayWebhookUrl: string | null;
}

export interface PaymentSettingsResponse {
  success: boolean;
  message: string;
  data: PaymentSettings;
}

export async function fetchContactMessages(params?: {
  page?: number;
  limit?: number;
  filter?: string;
  search?: string;
}): Promise<ContactMessagesResponse> {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set("page", String(params.page));
  }

  if (params?.limit) {
    query.set("limit", String(params.limit));
  }

  if (params?.filter) {
    query.set("filter", params.filter);
  }

  if (params?.search) {
    query.set("search", params.search);
  }

  const queryString = query.toString();

  const response = await api.get<ContactMessagesResponse>(
    `/admin/contact-messages${queryString ? `?${queryString}` : ""}`
  );

  return response.data;
}

export async function fetchContactMessageById(
  id: string
): Promise<ContactMessageResponse> {
  const response = await api.get<ContactMessageResponse>(
    `/admin/contact-messages/${id}`
  );

  return response.data;
}

export async function markContactMessageRead(
  id: string,
  isRead = true
): Promise<ContactMessageResponse> {
  const response = await api.patch<ContactMessageResponse>(
    `/admin/contact-messages/${id}/read`,
    { isRead }
  );

  return response.data;
}

export async function markAllContactMessagesRead(): Promise<{
  success: boolean;
  data: { count: number };
}> {
  const response = await api.patch<{
    success: boolean;
    data: { count: number };
  }>("/admin/contact-messages/read-all");

  return response.data;
}

export async function deleteContactMessage(
  id: string
): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/admin/contact-messages/${id}`);

  return response.data;
}

export async function fetchUnreadContactMessageCount(): Promise<UnreadCountResponse> {
  const response = await api.get<UnreadCountResponse>(
    "/admin/contact-messages/unread-count"
  );

  return response.data;
}

export async function fetchContactSettings(): Promise<ContactSettingsResponse> {
  const response = await api.get<ContactSettingsResponse>(
    "/admin/contact-settings"
  );

  return response.data;
}

export async function updateContactSettings(
  settings: Partial<ContactSettings>
): Promise<ContactSettingsResponse> {
  const response = await api.put<ContactSettingsResponse>(
    "/admin/contact-settings",
    settings
  );

  return response.data;
}

export async function fetchPlatformSettings(): Promise<PlatformSettingsResponse> {
  const response = await api.get<PlatformSettingsResponse>(
    "/admin/settings/platform"
  );

  return response.data;
}

export async function updatePlatformSettings(
  settings: Partial<PlatformSettings>
): Promise<PlatformSettingsResponse> {
  const response = await api.put<PlatformSettingsResponse>(
    "/admin/settings/platform",
    settings
  );

  return response.data;
}

export async function fetchPaymentSettings(): Promise<PaymentSettingsResponse> {
  const response = await api.get<PaymentSettingsResponse>(
    "/admin/settings/payment"
  );

  return response.data;
}

export async function updatePaymentSettings(
  settings: Partial<PaymentSettings>
): Promise<PaymentSettingsResponse> {
  const response = await api.put<PaymentSettingsResponse>(
    "/admin/settings/payment",
    settings
  );

  return response.data;
}

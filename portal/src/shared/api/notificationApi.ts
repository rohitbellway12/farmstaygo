import api from "./api";

export interface Notification {
  id: string;
  recipientType: string;
  recipientId: number;
  actorId: number;
  type: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: string | null;
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

export async function fetchNotifications(
  params?: {
    page?: number;
    limit?: number;
    filter?: string;
    search?: string;
  }
): Promise<NotificationListResponse> {
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

  const queryString =
    query.toString();

  const response = await api.get<NotificationListResponse>(
    `/notifications${queryString ? `?${queryString}` : ""}`
  );

  return response.data;
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const response = await api.get<UnreadCountResponse>(
    "/notifications/unread-count"
  );

  return response.data;
}

export async function markNotificationAsRead(
  id: string
): Promise<{ success: boolean; data: Notification }> {
  const response = await api.patch<{
    success: boolean;
    data: Notification;
  }>(`/notifications/${id}/read`);

  return response.data;
}

export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  data: { count: number };
}> {
  const response = await api.patch<{
    success: boolean;
    data: { count: number };
  }>("/notifications/read-all");

  return response.data;
}
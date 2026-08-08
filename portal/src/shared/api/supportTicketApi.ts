import api from "./api";

export interface SupportTicketReply {
  id: string;
  ticketId: string;
  userId: number;
  userEmail: string;
  userName: string;
  userRole: string;
  message: string;
  isStaffReply: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface SupportTicket {
  id: string;
  userId: number | null;
  userEmail: string;
  userName: string;
  userRole: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  assignedToId: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  assignedTo: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  replies: SupportTicketReply[];
  _count?: {
    replies: number;
  };
}

export interface SupportTicketsResponse {
  success: boolean;
  message: string;
  data: SupportTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface SupportTicketResponse {
  success: boolean;
  message: string;
  data: SupportTicket;
}

export interface SupportTicketStatsResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    open: number;
    inProgress: number;
    waiting: number;
    resolved: number;
    closed: number;
  };
}

export async function fetchSupportTickets(params?: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
}): Promise<SupportTicketsResponse> {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set("page", String(params.page));
  }

  if (params?.limit) {
    query.set("limit", String(params.limit));
  }

  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }

  if (params?.priority && params.priority !== "all") {
    query.set("priority", params.priority);
  }

  if (params?.search) {
    query.set("search", params.search);
  }

  const queryString = query.toString();
  const response = await api.get<SupportTicketsResponse>(
    `/admin/support-tickets${queryString ? `?${queryString}` : ""}`
  );

  return response.data;
}

export async function fetchMySupportTickets(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<SupportTicketsResponse> {
  const query = new URLSearchParams();

  if (params?.page) {
    query.set("page", String(params.page));
  }

  if (params?.limit) {
    query.set("limit", String(params.limit));
  }

  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }

  const queryString = query.toString();
  const response = await api.get<SupportTicketsResponse>(
    `/support-tickets/my${queryString ? `?${queryString}` : ""}`
  );

  return response.data;
}

export async function fetchSupportTicketById(
  id: string
): Promise<SupportTicketResponse> {
  const response = await api.get<SupportTicketResponse>(
    `/admin/support-tickets/${id}`
  );

  return response.data;
}

export async function createSupportTicket(
  data: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    userEmail?: string;
    userName?: string;
    autoAssign?: boolean;
  }
): Promise<{ success: boolean; message: string; data: SupportTicket }> {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: SupportTicket;
  }>("/support-tickets", data);

  return response.data;
}

export async function createPublicSupportTicket(
  data: {
    subject: string;
    description: string;
    userEmail: string;
    userName?: string;
    category?: string;
    priority?: string;
    autoAssign?: boolean;
  }
): Promise<{ success: boolean; message: string; data: SupportTicket }> {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: SupportTicket;
  }>("/support/public", data);

  return response.data;
}

export async function updateSupportTicket(
  id: string,
  data: {
    status?: string;
    priority?: string;
    assignedToId?: number | null;
    category?: string;
  }
): Promise<SupportTicketResponse> {
  const response = await api.patch<SupportTicketResponse>(
    `/admin/support-tickets/${id}`,
    data
  );

  return response.data;
}

export async function deleteSupportTicket(
  id: string
): Promise<{ success: boolean; message: string }> {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/admin/support-tickets/${id}`);

  return response.data;
}

export async function addSupportTicketReply(
  ticketId: string,
  message: string
): Promise<{ success: boolean; message: string; data: SupportTicketReply }> {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: SupportTicketReply;
  }>(`/support-tickets/${ticketId}/replies`, { message });

  return response.data;
}

export async function fetchSupportTicketStats(): Promise<SupportTicketStatsResponse> {
  const response = await api.get<SupportTicketStatsResponse>(
    "/admin/support-tickets/stats"
  );

  return response.data;
}

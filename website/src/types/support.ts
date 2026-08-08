"use client";

import { useEffect, useState } from "react";

import {
  apiFetch,
  ApiRequestError,
} from "@/lib/api";

export interface PublicSupportTicketReply {
  id: string;
  userName: string;
  userRole: string;
  message: string;
  isStaffReply: boolean;
  createdAt: string;
}

export interface PublicSupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: PublicSupportTicketReply[];
}

export interface PublicSupportTicketResponse {
  success: boolean;
  message: string;
  data: PublicSupportTicket;
}

export interface PublicSupportTicketsResponse {
  success: boolean;
  message: string;
  data: PublicSupportTicket[];
}

export async function createPublicSupportTicket(data: {
  subject: string;
  description: string;
  userEmail: string;
  userName?: string;
  category?: string;
  priority?: string;
}): Promise<PublicSupportTicketResponse> {
  const response = await apiFetch<PublicSupportTicketResponse>(
    "/support/public",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  return response;
}

export async function fetchPublicSupportTicketsByEmail(
  email: string
): Promise<PublicSupportTicketsResponse> {
  const response = await apiFetch<PublicSupportTicketsResponse>(
    `/support/lookup?email=${encodeURIComponent(email)}`
  );

  return response;
}

export async function fetchPublicSupportTicketById(
  id: string
): Promise<PublicSupportTicketResponse> {
  const response = await apiFetch<PublicSupportTicketResponse>(
    `/support/lookup/${id}`
  );

  return response;
}

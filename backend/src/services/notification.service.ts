import {
  NotificationRecipientType,
  NotificationType,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

interface AdminNotificationPayload {
  type?: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export const notifyAdmins = async (
  payload: AdminNotificationPayload
): Promise<void> => {
  const admins = await prisma.user.findMany({
    where: {
      role: {
        in: ["ADMIN", "STAFF_ADMIN", "SUPPORT"],
      },
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (admins.length === 0) {
    return;
  }

  const notificationData: Prisma.NotificationCreateInput[] = admins.map(
    (admin) => ({
      recipientType: NotificationRecipientType.ADMIN,
      recipientId: admin.id,
      actorId: admins[0]!.id,
      type: payload.type ?? NotificationType.SYSTEM,
      entityType: payload.entityType ?? null,
      entityId: payload.entityId ?? null,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata
        ? JSON.stringify(payload.metadata)
        : null,
    })
  );

  await prisma.notification.createMany({
    data: notificationData,
  });
};

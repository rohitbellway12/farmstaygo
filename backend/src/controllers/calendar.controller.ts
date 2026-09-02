import "dotenv/config";

import ical from "ical";

import type {
  Request,
  Response,
} from "express";

import {
  BookingStatus,
  PropertyBookingType,
  PropertyStatus,
  type Prisma,
} from "../generated/prisma/client.js";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import { getBackendBaseUrl } from "../config/url.js";

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const ICS_FETCH_TIMEOUT_MS = 15_000;

const BOOKING_HOLD_MINUTES = 5;

const SYNC_NOTE_PREFIX = "iCal sync";

/*
|--------------------------------------------------------------------------
| Date Helpers
|--------------------------------------------------------------------------
*/

function formatDateKey(date: Date): string {
  return date
    .toISOString()
    .slice(0, 10);
}

function getTodayDateOnly(): Date {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
}

function addDays(
  date: Date,
  days: number
): Date {
  return new Date(
    date.getTime() +
      days * 24 * 60 * 60 * 1000
  );
}

function buildNights(
  checkIn: Date,
  checkOut: Date
): Date[] {
  const nights: Date[] = [];

  let current = checkIn;

  while (current.getTime() < checkOut.getTime()) {
    nights.push(current);
    current = addDays(current, 1);
  }

  return nights;
}

/*
|--------------------------------------------------------------------------
| ICS Generation
|--------------------------------------------------------------------------
*/

function formatIcsDate(date: Date): string {
  return formatDateKey(date).replace(/-/g, "");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

interface IcsEventInput {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  url?: string;
}

function generateIcsCalendar(
  propertyTitle: string,
  events: IcsEventInput[]
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//FarmStayGo//${escapeIcsText(propertyTitle)}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:UTC",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0000",
    "TZNAME:UTC",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0000",
    "TZNAME:UTC",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(event.uid)}`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(event.end)}`);

    if (event.summary) {
      lines.push(
        `SUMMARY:${escapeIcsText(event.summary)}`
      );
    }

    if (event.description) {
      lines.push(
        `DESCRIPTION:${escapeIcsText(event.description)}`
      );
    }

    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

/*
|--------------------------------------------------------------------------
| ICS Parsing
|--------------------------------------------------------------------------
|
| Uses the "ical" package's parseICS function to extract VEVENT entries
| from an external ICS feed. Returns date ranges (start/end pairs).
|
*/

interface ParsedIcsEvent {
  start: Date;
  end: Date;
  summary?: string;
  description?: string;
  uid?: string;
}

function parseIcsEvents(icsText: string): ParsedIcsEvent[] {
  const parsed = ical.parseICS(icsText);

  const events: ParsedIcsEvent[] = [];

  for (const key in parsed) {
    if (
      !Object.prototype.hasOwnProperty.call(
        parsed,
        key
      )
    ) {
      continue;
    }

    const entry = parsed[key];

    if (entry?.type !== "VEVENT") {
      continue;
    }

    if (!entry.start || !entry.end) {
      continue;
    }

    const startDate = new Date(entry.start);
    const endDate = new Date(entry.end);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      continue;
    }

    events.push({
      start: startDate,
      end: endDate,
      summary: typeof entry.summary === "string"
        ? entry.summary
        : undefined,
      description: typeof entry.description === "string"
        ? entry.description
        : undefined,
      uid: typeof entry.uid === "string"
        ? entry.uid
        : undefined,
    });
  }

  return events;
}

/*
|--------------------------------------------------------------------------
| Booking Availability Query
|--------------------------------------------------------------------------
|
| Replicates the ACTIVE availability-booking logic so the ICS export and
| sync logic agree with what the public calendar shows as "booked".
|
*/

const getActiveBookingWhere =
  (): Prisma.BookingWhereInput => {
    const holdCutoff = new Date(
      Date.now() -
        BOOKING_HOLD_MINUTES * 60 * 1000
    );

    return {
      OR: [
        {
          status: BookingStatus.CONFIRMED,
        },
        {
          status: BookingStatus.REQUESTED,
          OR: [
            {
              reservationAmount: null,
            },
            {
              reservationAmount: {
                lte: 0,
              },
            },
            {
              paymentStatus: {
                not: "PENDING",
              },
            },
            {
              createdAt: {
                gte: holdCutoff,
              },
            },
          ],
        },
      ],
    } satisfies Prisma.BookingWhereInput;
  };

/*
|--------------------------------------------------------------------------
| Block Helpers (used by sync logic)
|--------------------------------------------------------------------------
*/

async function clearSyncedBlocks(
  propertyId: string,
  calendarImportId: string
): Promise<void> {
  await prisma.propertyAvailabilityBlock.deleteMany({
    where: {
      propertyId,
      calendarImportId,
    },
  });

  await prisma.roomAvailabilityBlock.deleteMany({
    where: {
      roomType: {
        propertyId,
      },
      calendarImportId,
    },
  });
}

interface SyncedDateBlock {
  date: Date;
  dateKey: string;
}

async function blockSyncedDates(
  property: {
    id: string;
    bookingType: PropertyBookingType;
    roomTypes: { id: string; totalRooms: number }[];
  },
  dates: SyncedDateBlock[],
  calendarImportId: string,
  note: string
): Promise<number> {
  if (dates.length === 0) {
    return 0;
  }

  const now = getTodayDateOnly();

  const futureDates = dates.filter(
    (d) => d.date.getTime() >= now.getTime()
  );

  if (futureDates.length === 0) {
    return 0;
  }

  const supportsEntire =
    property.bookingType ===
      PropertyBookingType.ENTIRE_PROPERTY ||
    property.bookingType ===
      PropertyBookingType.BOTH;

  const supportsRooms =
    property.bookingType ===
      PropertyBookingType.ROOM_WISE ||
    property.bookingType ===
      PropertyBookingType.BOTH;

  await prisma.$transaction(async (tx) => {
    if (supportsEntire) {
      for (const d of futureDates) {
        await tx.propertyAvailabilityBlock.upsert({
          where: {
            propertyId_date: {
              propertyId: property.id,
              date: d.date,
            },
          },
          create: {
            propertyId: property.id,
            date: d.date,
            note,
            calendarImportId,
          },
          update: {
            note,
            calendarImportId,
          },
        });
      }
    }

    if (supportsRooms && property.roomTypes.length > 0) {
      for (const d of futureDates) {
        for (const rt of property.roomTypes) {
          const blockedRooms = rt.totalRooms;

          await tx.roomAvailabilityBlock.upsert({
            where: {
              roomTypeId_date: {
                roomTypeId: rt.id,
                date: d.date,
              },
            },
            create: {
              roomTypeId: rt.id,
              date: d.date,
              blockedRooms,
              note,
              calendarImportId,
            },
            update: {
              blockedRooms,
              note,
              calendarImportId,
            },
          });
        }
      }
    }
  });

  return futureDates.length;
}

/*
|--------------------------------------------------------------------------
| Core: Sync a Single Calendar Import
|--------------------------------------------------------------------------
*/

export const syncSingleCalendarImport = async (
  importId: string
): Promise<{
  success: boolean;
  blockedDates: number;
  message: string;
}> => {
  const calendarImport =
    await prisma.calendarImport.findUnique({
      where: { id: importId },
      include: {
        property: {
          select: {
            id: true,
            bookingType: true,
            roomTypes: {
              where: { isActive: true },
              select: {
                id: true,
                totalRooms: true,
              },
            },
          },
        },
      },
    });

  if (!calendarImport) {
    return {
      success: false,
      blockedDates: 0,
      message: "Calendar import not found",
    };
  }

  if (!calendarImport.isActive) {
    return {
      success: false,
      blockedDates: 0,
      message: "Calendar import is inactive",
    };
  }

  const note = `${SYNC_NOTE_PREFIX}: ${calendarImport.name}`;

  try {
    const res = await fetch(
      calendarImport.url,
      {
        signal: AbortSignal.timeout(ICS_FETCH_TIMEOUT_MS),
      }
    );

    if (!res.ok) {
      await prisma.calendarImport.update({
        where: { id: importId },
        data: {
          lastSyncAt: new Date(),
          lastError: `ICS request failed: ${res.status}`,
        },
      });

      return {
        success: false,
        blockedDates: 0,
        message: `ICS request failed: ${res.status}`,
      };
    }

    const icsText = await res.text();

    let events: ParsedIcsEvent[];

    try {
      events = parseIcsEvents(icsText);
    } catch (parseError) {
      await prisma.calendarImport.update({
        where: { id: importId },
        data: {
          lastSyncAt: new Date(),
          lastError:
            parseError instanceof Error
              ? parseError.message
              : "Failed to parse ICS",
        },
      });

      return {
        success: false,
        blockedDates: 0,
        message: "Failed to parse ICS feed",
      };
    }

    // Collect all blocked nights across all events
    const allDates: SyncedDateBlock[] = [];

    for (const event of events) {
      const nights = buildNights(event.start, event.end);

      for (const night of nights) {
        allDates.push({
          date: night,
          dateKey: formatDateKey(night),
        });
      }
    }

    // Remove old synced blocks, then create fresh ones
    await clearSyncedBlocks(calendarImport.property.id, importId);

    const blockedCount = await blockSyncedDates(
      calendarImport.property,
      allDates,
      importId,
      note
    );

    await prisma.calendarImport.update({
      where: { id: importId },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    return {
      success: true,
      blockedDates: blockedCount,
      message: `Successfully synced ${events.length} event(s), blocked ${blockedCount} date(s)`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await prisma.calendarImport.update({
      where: { id: importId },
      data: {
        lastSyncAt: new Date(),
        lastError: errorMessage,
      },
    });

    return {
      success: false,
      blockedDates: 0,
      message: `Sync failed: ${errorMessage}`,
    };
  }
};

/*
|--------------------------------------------------------------------------
| Core: Sync All Active Calendar Imports
|--------------------------------------------------------------------------
*/

export const syncAllCalendarImports =
  async (): Promise<void> => {
    console.log(
      "[calendarSync] Starting round of external calendar sync"
    );

    const activeImports =
      await prisma.calendarImport.findMany({
        where: { isActive: true },
        include: {
          property: {
            select: {
              id: true,
              bookingType: true,
              roomTypes: {
                where: { isActive: true },
                select: {
                  id: true,
                  totalRooms: true,
                },
              },
            },
          },
        },
      });

    if (activeImports.length === 0) {
      console.log(
        "[calendarSync] No active calendar imports to sync"
      );
      return;
    }

    console.log(
      `[calendarSync] Syncing ${activeImports.length} active calendar import(s)`
    );

    for (const imp of activeImports) {
      try {
        const result = await syncSingleCalendarImport(
          imp.id
        );

        if (result.success) {
          console.log(
            `[calendarSync] ${imp.name} (property ${imp.propertyId}): ${result.message}`
          );
        } else {
          console.warn(
            `[calendarSync] ${imp.name} (property ${imp.propertyId}): ${result.message}`
          );
        }
      } catch (error) {
        console.error(
          `[calendarSync] Unexpected error syncing import ${imp.id}:`,
          error
        );
      }
    }

    console.log(
      "[calendarSync] Round complete"
    );
  };

/*
|--------------------------------------------------------------------------
| On-Demand: Sync All Active Calendar Imports for a Single Property
|--------------------------------------------------------------------------
|
| Called right before calculating booking quote / checkout to ensure 0%
| double-booking risk in real time.
|
*/

export const syncPropertyCalendarImports = async (
  propertyId: string
): Promise<void> => {
  try {
    const activeImports = await prisma.calendarImport.findMany({
      where: {
        propertyId,
        isActive: true,
      },
      select: { id: true },
    });

    if (activeImports.length === 0) return;

    await Promise.allSettled(
      activeImports.map((imp) => syncSingleCalendarImport(imp.id))
    );
  } catch (error) {
    console.warn(
      `[calendarSync] On-demand sync for property ${propertyId} failed:`,
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| Vendor: Resolve owned property with minimal fields
|--------------------------------------------------------------------------
*/

async function getVendorOwnedPropertyForCalendar(
  userId: number,
  propertyId: string
) {
  return prisma.property.findFirst({
    where: {
      id: propertyId,
      vendor: {
        userId,
      },
    },

    select: {
      id: true,
      title: true,
      bookingType: true,
      roomTypes: {
        where: { isActive: true },
        select: {
          id: true,
          totalRooms: true,
        },
      },
    },
  });
}

function getPropertyIcsUrl(propertyId: string): string {
  return `${getBackendBaseUrl()}/api/public/properties/${propertyId}/ical`;
}

/*
|--------------------------------------------------------------------------
| Vendor: List Calendar Imports for a Property
|--------------------------------------------------------------------------
|
| GET /api/vendor/properties/:propertyId/calendar-imports
|
*/

export const getCalendarImports =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID is required",
        });
      }

      const property =
        await getVendorOwnedPropertyForCalendar(
          req.user.id,
          propertyId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found",
        });
      }

      const imports =
        await prisma.calendarImport.findMany({
          where: {
            propertyId: property.id,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return res.status(200).json({
        success: true,
        message:
          "Calendar imports fetched successfully",
        data: {
          imports,
          exportUrl:
            getPropertyIcsUrl(property.id),
        },
      });
    } catch (error) {
      console.error(
        "Get calendar imports error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch calendar imports",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Create Calendar Import
|--------------------------------------------------------------------------
|
| POST /api/vendor/properties/:propertyId/calendar-imports
|
| {
|   "name": "Airbnb",
|   "url":  "https://www.airbnb.com/calendar/ical/xxx"
| }
|
*/

interface CalendarImportBody {
  name?: unknown;
  url?: unknown;
  isActive?: unknown;
}

export const createCalendarImport =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      if (!propertyId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID is required",
        });
      }

      const property =
        await getVendorOwnedPropertyForCalendar(
          req.user.id,
          propertyId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found",
        });
      }

      const body =
        req.body as CalendarImportBody;

      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";

      const url =
        typeof body.url === "string"
          ? body.url.trim()
          : "";

      if (!name) {
        return res.status(422).json({
          success: false,
          message:
            "Calendar name is required",
          errors: {
            name:
              "Please enter a name for this calendar (e.g. Airbnb).",
          },
        });
      }

      if (
        !url ||
        !url.startsWith("https://") &&
          !url.startsWith("http://")
      ) {
        return res.status(422).json({
          success: false,
          message:
            "A valid iCal URL is required",
          errors: {
            url:
              "Please paste a valid iCal/ICS URL starting with http:// or https://.",
          },
        });
      }

      const existing =
        await prisma.calendarImport.findFirst({
          where: {
            propertyId: property.id,
            url,
          },
        });

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "This calendar URL is already added for this property",
        });
      }

      const created =
        await prisma.calendarImport.create({
          data: {
            propertyId: property.id,
            name,
            url,
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "Calendar import added successfully",
        data: created,
      });
    } catch (error) {
      console.error(
        "Create calendar import error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to add calendar import",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Update Calendar Import
|--------------------------------------------------------------------------
|
| PUT /api/vendor/properties/:propertyId/calendar-imports/:id
|
| {
|   "name": "Airbnb (Updated)",
|   "isActive": true,
|   "url": "https://..."
| }
|
*/

export const updateCalendarImport =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      const importId = String(
        req.params.id || ""
      ).trim();

      if (!propertyId || !importId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and import ID are required",
        });
      }

      const property =
        await getVendorOwnedPropertyForCalendar(
          req.user.id,
          propertyId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found",
        });
      }

      const existing =
        await prisma.calendarImport.findFirst({
          where: {
            id: importId,
            propertyId: property.id,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Calendar import not found",
        });
      }

      const body =
        req.body as CalendarImportBody;

      const data: Record<string, unknown> = {};

      if (body.name !== undefined) {
        const name =
          typeof body.name === "string"
            ? body.name.trim()
            : "";

        if (!name) {
          return res.status(422).json({
            success: false,
            message:
              "Calendar name cannot be empty",
            errors: {
              name:
                "Please enter a name for this calendar.",
            },
          });
        }

        data.name = name;
      }

      if (body.isActive !== undefined) {
        data.isActive = body.isActive === true;
      }

      if (body.url !== undefined) {
        const url =
          typeof body.url === "string"
            ? body.url.trim()
            : "";

        if (
          !url ||
          !/^https?:\/\//i.test(url)
        ) {
          return res.status(422).json({
            success: false,
            message:
              "A valid iCal URL is required",
            errors: {
              url:
                "Please paste a valid iCal/ICS URL.",
            },
          });
        }

        data.url = url;
      }

      const updated =
        await prisma.calendarImport.update({
          where: { id: importId },
          data,
        });

      return res.status(200).json({
        success: true,
        message:
          "Calendar import updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error(
        "Update calendar import error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update calendar import",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Delete Calendar Import
|--------------------------------------------------------------------------
|
| DELETE /api/vendor/properties/:propertyId/calendar-imports/:id
|
*/

export const deleteCalendarImport =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized",
        });
      }

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      const importId = String(
        req.params.id || ""
      ).trim();

      if (!propertyId || !importId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and import ID are required",
        });
      }

      const property =
        await getVendorOwnedPropertyForCalendar(
          req.user.id,
          propertyId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found",
        });
      }

      const existing =
        await prisma.calendarImport.findFirst({
          where: {
            id: importId,
            propertyId: property.id,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Calendar import not found",
        });
      }

      // Clean up synced blocks before deleting
      await clearSyncedBlocks(
        property.id,
        importId
      );

      await prisma.calendarImport.delete({
        where: { id: importId },
      });

      return res.status(200).json({
        success: true,
        message:
          "Calendar import removed successfully",
      });
    } catch (error) {
      console.error(
        "Delete calendar import error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete calendar import",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Vendor: Trigger Manual Sync
|--------------------------------------------------------------------------
|
| POST /api/vendor/properties/:propertyId/calendar-imports/:id/sync
|
*/

export const triggerCalendarImportSync =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const propertyId = String(
        req.params.propertyId || ""
      ).trim();

      const importId = String(
        req.params.id || ""
      ).trim();

      if (!propertyId || !importId) {
        return res.status(422).json({
          success: false,
          message:
            "Property ID and import ID are required",
        });
      }

      const property =
        await getVendorOwnedPropertyForCalendar(
          req.user.id,
          propertyId
        );

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found",
        });
      }

      const existing =
        await prisma.calendarImport.findFirst({
          where: {
            id: importId,
            propertyId: property.id,
          },
        });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Calendar import not found",
        });
      }

      const result =
        await syncSingleCalendarImport(
          importId
        );

      return res.status(
        result.success ? 200 : 422
      ).json({
        success: result.success,
        message: result.message,
        data: {
          blockedDates: result.blockedDates,
        },
      });
    } catch (error) {
      console.error(
        "Trigger calendar sync error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to trigger calendar sync",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| Public: Property iCal Export Feed
|--------------------------------------------------------------------------
|
| GET /api/public/properties/:identifier/ical
|
| Generates a live ICS feed of all booked/unavailable dates
| for a property. Other platforms (Airbnb, Booking.com) can import
| this URL to automatically sync FarmStayGo bookings.
|
*/

export const getPropertyIcsFeed =
  async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const publicId = String(
        req.params.identifier || ""
      ).trim();

      if (!publicId) {
        return res.status(422).json({
          success: false,
          message:
            "Property identifier is required",
        });
      }

      const property =
        await prisma.property.findFirst({
          where: {
            id: publicId,
            status:
              PropertyStatus.APPROVED,
            category: {
              isActive: true,
            },
          },

          select: {
            id: true,
            title: true,
            bookingType: true,
          },
        });

      if (!property) {
        return res.status(404).json({
          success: false,
          message:
            "Property not found or unavailable",
        });
      }

      const events: IcsEventInput[] = [];

      // 1. Active bookings (CONFIRMED or REQUESTED-with-payment)
      const bookings =
        await prisma.booking.findMany({
          where: {
            propertyId: property.id,
            ...getActiveBookingWhere(),
            checkIn: {
              gte: getTodayDateOnly(),
            },
          },

          select: {
            id: true,
            guestName: true,
            checkIn: true,
            checkOut: true,
            bookingMode: true,
            status: true,
          },

          orderBy: {
            checkIn: "asc",
          },
        });

      for (const booking of bookings) {
        events.push({
          uid: `booking-${booking.id}@farmstaygo.com`,
          start: booking.checkIn,
          end: booking.checkOut,
          summary: `FarmStayGo Booking #${
            booking.id
          }`,
          description:
            `${booking.status} ${booking.bookingMode} — Guest: ${booking.guestName}`,
          url:
            getBackendBaseUrl(req) +
            `/properties/${property.id}`,
        });
      }

      // 2. Manual property availability blocks (not from iCal sync)
      const manualBlocks =
        await prisma.propertyAvailabilityBlock.findMany({
          where: {
            propertyId: property.id,
            calendarImportId: null,
            date: {
              gte: getTodayDateOnly(),
            },
          },

          orderBy: {
            date: "asc",
          },
        });

      for (const block of manualBlocks) {
        events.push({
          uid: `block-${block.id}@farmstaygo.com`,
          start: block.date,
          end: addDays(block.date, 1),
          summary: "Not Available",
          description:
            block.note || "Blocked by property owner",
          url:
            getBackendBaseUrl(req) +
            `/properties/${property.id}`,
        });
      }

      // 3. Room availability blocks for room-wise booking types
      if (
        property.bookingType ===
          PropertyBookingType.ROOM_WISE ||
        property.bookingType ===
          PropertyBookingType.BOTH
      ) {
        const roomBlocks =
          await prisma.roomAvailabilityBlock.findMany({
            where: {
              roomType: {
                propertyId: property.id,
              },
              blockedRooms: {
                gt: 0,
              },
              calendarImportId: null,
              date: {
                gte: getTodayDateOnly(),
              },
            },

            select: {
              id: true,
              date: true,
              blockedRooms: true,
              note: true,
              roomType: {
                select: {
                  name: true,
                },
              },
            },

            orderBy: {
              date: "asc",
            },
          });

        for (const block of roomBlocks) {
          events.push({
            uid: `room-block-${block.id}@farmstaygo.com`,
            start: block.date,
            end: addDays(block.date, 1),
            summary: "Not Available",
            description:
              block.note ||
              `${block.blockedRooms} room(s) blocked` +
                (block.roomType?.name
                  ? ` — ${block.roomType.name}`
                  : ""),
            url:
              getBackendBaseUrl(req) +
              `/properties/${property.id}`,
          });
        }
      }

      const icsText = generateIcsCalendar(
        property.title,
        events
      );

      res.set(
        "Content-Type",
        "text/calendar; charset=utf-8"
      );

      res.set(
        "Content-Disposition",
        `inline; filename="${property.id}.ics"`
      );

      return res.send(icsText);
    } catch (error) {
      console.error(
        "Property ICS feed error:",
        error
      );

      return res.status(500).set(
        "Content-Type",
        "text/plain"
      ).send(
        "Unable to generate calendar feed"
      );
    }
  };

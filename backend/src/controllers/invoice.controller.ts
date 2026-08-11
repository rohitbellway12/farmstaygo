import fs from "node:fs";

import type { Response } from "express";

import prisma from "../config/database.js";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  generateInvoicePdf,
  getInvoiceFilePath,
} from "../services/invoice.js";

export const generateInvoice = async (
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

    const bookingId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!bookingId) {
      return res.status(422).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { userId: req.user.id },
          { property: { vendor: { userId: req.user.id } } },
        ],
      },
      include: {
        property: {
          select: {
            title: true,
            city: true,
            state: true,
            addressLine1: true,
          },
        },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
        },
      },
        payments: {
          select: {
            amount: true,
            paymentMethod: true,
            paymentType: true,
            status: true,
            transactionId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const payments = booking.payments;
    const totalPaid = payments
      .filter((p) => p.status === "COMPLETED" && p.paymentType !== "REFUND")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalAmount = totalPaid > 0
      ? totalPaid
      : booking.estimatedTotal
        ? Number(booking.estimatedTotal)
        : 0;

    const totalNights = booking.totalNights;
    const rooms = booking.rooms;

    const ratePerNight = totalNights > 0 && rooms > 0
      ? totalAmount / (totalNights * rooms)
      : totalAmount;

    const taxRate = 0;
    const taxAmount = 0;
    const subtotal = totalAmount;

    const invoiceData = {
      bookingId: booking.id,
      invoiceNumber: `INV-${booking.id.slice(0, 8).toUpperCase()}`,
      issueDate: new Date().toISOString().slice(0, 10),
      guestName: `${booking.user.firstName} ${booking.user.lastName}`,
      guestEmail: booking.user.email,
      guestMobile: booking.user.mobile ?? null,
      propertyTitle: booking.property.title,
      propertyAddress: booking.property.addressLine1
        ? `${booking.property.addressLine1}${booking.property.city ? `, ${booking.property.city}` : ""}${booking.property.state ? `, ${booking.property.state}` : ""}`
        : null,
      checkIn: booking.checkIn.toISOString().slice(0, 10),
      checkOut: booking.checkOut.toISOString().slice(0, 10),
      totalNights: booking.totalNights,
      guests: booking.guests,
      rooms: booking.rooms,
      ratePerNight: Math.round(ratePerNight * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate,
      taxAmount,
      totalAmount: Math.round(totalAmount * 100) / 100,
      currency: booking.currency,
      paymentStatus: booking.paymentStatus,
      bookingStatus: booking.status,
      payments: payments
        .filter((p) => p.status === "COMPLETED" && p.paymentType !== "REFUND")
        .map((p) => ({
          amount: Number(p.amount),
          paymentMethod: p.paymentMethod,
          paymentType: p.paymentType,
          status: p.status,
          transactionId: p.transactionId,
          createdAt: p.createdAt.toISOString().slice(0, 10),
        })),
      totalPaid: Math.round(totalPaid * 100) / 100,
      remainingBalance: Math.round(Math.max(0, Number(booking.estimatedTotal || 0) - totalPaid) * 100) / 100,
    };

    const filePath = getInvoiceFilePath(bookingId);

    await generateInvoicePdf(invoiceData, filePath);

    const publicUrl = `${process.env.PUBLIC_STORAGE_URL || "http://localhost:5000/uploads"}/invoices/${`invoice_${bookingId}.pdf`}`;

    const downloadUrl = `${req.protocol}://${req.get("host")}/api/invoices/${bookingId}/download`;

    return res.json({
      success: true,
      message: "Invoice generated successfully",
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        filePath,
        publicUrl,
        downloadUrl,
      },
    });
  } catch (error) {
    console.error("Generate invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate invoice",
    });
  }
};

export const downloadInvoice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const bookingId =
      typeof req.params.id === "string"
        ? req.params.id.trim()
        : "";

    if (!bookingId) {
      return res.status(422).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { userId: req.user.id },
          { property: { vendor: { userId: req.user.id } } },
        ],
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const filePath = getInvoiceFilePath(bookingId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found. Please generate it first.",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice_${bookingId}.pdf"`
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    return;
  } catch (error) {
    console.error("Download invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to download invoice",
    });
  }
};
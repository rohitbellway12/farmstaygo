import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const INVOICE_OUTPUT_DIR =
  process.env.INVOICE_OUTPUT_DIR || "storage/invoices";

export interface InvoiceData {
  bookingId: string;
  invoiceNumber: string;
  issueDate: string;
  guestName: string;
  guestEmail: string;
  guestMobile: string | null;
  propertyTitle: string;
  propertyAddress: string | null;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  guests: number;
  rooms: number;
  ratePerNight: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  bookingStatus: string;
}

export const generateInvoicePdf = (
  invoiceData: InvoiceData,
  outputPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.dirname(outputPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        bufferPages: true,
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const currency = invoiceData.currency || "INR";

      const leftMargin = doc.page.margins.left;
      const rightMargin = doc.page.margins.right;
      const contentWidth =
        doc.page.width - leftMargin - rightMargin;

      const primaryColor = "#2d6a4f";
      const accentColor = "#17533e";
      const lightBackground = "#f0f7f4";
      const borderColor = "#d6ddd9";
      const textColor = "#333333";
      const mutedColor = "#777777";

      const formatMoney = (amount: number): string => {
        return `${currency} ${Number(amount || 0).toFixed(2)}`;
      };

      /*
       * Header
       */
      const headerHeight = 65;

      doc
        .rect(0, 0, doc.page.width, headerHeight)
        .fill(primaryColor);

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(21)
        .text("FarmStayGo", leftMargin, 14, {
          width: 220,
        });

      doc
        .font("Helvetica")
        .fontSize(8.5)
        .text("BOOKING INVOICE", leftMargin, 41, {
          width: 220,
          characterSpacing: 0.8,
        });

      const invoiceMetaX = doc.page.width - rightMargin - 210;
      const invoiceMetaWidth = 210;

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
          `Invoice #: ${invoiceData.invoiceNumber}`,
          invoiceMetaX,
          13,
          {
            width: invoiceMetaWidth,
            align: "right",
          }
        );

      doc
        .font("Helvetica")
        .text(
          `Issue Date: ${invoiceData.issueDate}`,
          invoiceMetaX,
          28,
          {
            width: invoiceMetaWidth,
            align: "right",
          }
        );

      doc.text(
        `Booking Status: ${invoiceData.bookingStatus}`,
        invoiceMetaX,
        43,
        {
          width: invoiceMetaWidth,
          align: "right",
        }
      );

      doc.y = headerHeight + 20;

      /*
       * Common helpers
       */
      const sectionTitle = (title: string): void => {
        const titleY = doc.y;

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(accentColor)
          .text(title, leftMargin, titleY, {
            width: contentWidth,
          });

        doc
          .moveTo(leftMargin, titleY + 15)
          .lineTo(leftMargin + contentWidth, titleY + 15)
          .strokeColor(borderColor)
          .lineWidth(0.6)
          .stroke();

        doc.y = titleY + 24;
      };

      const detailRow = (
        label: string,
        value: string,
        y: number
      ): void => {
        const labelWidth = 85;
        const valueX = leftMargin + labelWidth;

        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(mutedColor)
          .text(`${label}:`, leftMargin, y, {
            width: labelWidth - 8,
          });

        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(textColor)
          .text(value || "N/A", valueX, y, {
            width: contentWidth - labelWidth,
          });
      };

      /*
       * Bill To
       */
      sectionTitle("Bill To");

      const billToStartY = doc.y;

      detailRow("Name", invoiceData.guestName, billToStartY);
      detailRow("Email", invoiceData.guestEmail, billToStartY + 15);

      if (invoiceData.guestMobile) {
        detailRow(
          "Mobile",
          invoiceData.guestMobile,
          billToStartY + 30
        );
      }

      doc.y =
        billToStartY +
        (invoiceData.guestMobile ? 52 : 37);

      /*
       * Booking Details
       */
      sectionTitle("Booking Details");

      const bookingDetailsStartY = doc.y;
      const columnGap = 20;
      const detailColumnWidth =
        (contentWidth - columnGap) / 2;

      const leftColumnX = leftMargin;
      const rightColumnX =
        leftMargin + detailColumnWidth + columnGap;

      const drawBookingDetail = (
        label: string,
        value: string,
        x: number,
        y: number
      ): number => {
        const labelWidth = 72;
        const valueX = x + labelWidth;
        const valueWidth =
          detailColumnWidth - labelWidth;

        doc
          .font("Helvetica-Bold")
          .fontSize(7.5)
          .fillColor(mutedColor)
          .text(`${label}:`, x, y, {
            width: labelWidth - 5,
          });

        const valueHeight = doc.heightOfString(
          value || "N/A",
          {
            width: valueWidth,
            lineGap: 1,
          }
        );

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(textColor)
          .text(value || "N/A", valueX, y, {
            width: valueWidth,
            lineGap: 1,
          });

        return Math.max(14, valueHeight + 3);
      };

      const leftDetails = [
        ["Booking ID", invoiceData.bookingId],
        ["Property", invoiceData.propertyTitle],
        [
          "Address",
          invoiceData.propertyAddress || "N/A",
        ],
        ["Payment", invoiceData.paymentStatus],
      ];

      const rightDetails = [
        ["Check-In", invoiceData.checkIn],
        ["Check-Out", invoiceData.checkOut],
        ["Nights", String(invoiceData.totalNights)],
        [
          "Guests / Rooms",
          `${invoiceData.guests} / ${invoiceData.rooms}`,
        ],
      ];

      let leftY = bookingDetailsStartY;
      let rightY = bookingDetailsStartY;

      for (const [label, value] of leftDetails) {
        leftY += drawBookingDetail(
          label,
          value,
          leftColumnX,
          leftY
        );
      }

      for (const [label, value] of rightDetails) {
        rightY += drawBookingDetail(
          label,
          value,
          rightColumnX,
          rightY
        );
      }

      doc.y = Math.max(leftY, rightY) + 13;

      /*
       * Line Items
       */
      sectionTitle("Line Items");

      const tableX = leftMargin;
      const tableWidth = contentWidth;

      const descriptionWidth = tableWidth * 0.48;
      const quantityWidth = tableWidth * 0.12;
      const rateWidth = tableWidth * 0.20;
      const amountWidth =
        tableWidth -
        descriptionWidth -
        quantityWidth -
        rateWidth;

      const descriptionX = tableX;
      const quantityX =
        descriptionX + descriptionWidth;
      const rateX = quantityX + quantityWidth;
      const amountX = rateX + rateWidth;

      const tableHeaderHeight = 25;
      const tableHeaderY = doc.y;

      doc
        .rect(
          tableX,
          tableHeaderY,
          tableWidth,
          tableHeaderHeight
        )
        .fill(lightBackground);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(primaryColor)
        .text(
          "Description",
          descriptionX + 7,
          tableHeaderY + 8,
          {
            width: descriptionWidth - 14,
          }
        );

      doc.text(
        "Qty",
        quantityX,
        tableHeaderY + 8,
        {
          width: quantityWidth - 7,
          align: "center",
        }
      );

      doc.text(
        "Rate",
        rateX,
        tableHeaderY + 8,
        {
          width: rateWidth - 7,
          align: "right",
        }
      );

      doc.text(
        "Amount",
        amountX,
        tableHeaderY + 8,
        {
          width: amountWidth - 7,
          align: "right",
        }
      );

      const itemDescription =
        `${invoiceData.rooms} room(s) × ` +
        `${invoiceData.totalNights} night(s)`;

      const lineAmount =
        invoiceData.ratePerNight *
        invoiceData.rooms *
        invoiceData.totalNights;

      const itemTopY =
        tableHeaderY + tableHeaderHeight;

      const descriptionHeight = doc.heightOfString(
        itemDescription,
        {
          width: descriptionWidth - 14,
        }
      );

      const itemRowHeight = Math.max(
        30,
        descriptionHeight + 16
      );

      doc
        .rect(
          tableX,
          itemTopY,
          tableWidth,
          itemRowHeight
        )
        .strokeColor(borderColor)
        .lineWidth(0.6)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(textColor)
        .text(
          itemDescription,
          descriptionX + 7,
          itemTopY + 10,
          {
            width: descriptionWidth - 14,
          }
        );

      doc.text(
        String(invoiceData.rooms),
        quantityX,
        itemTopY + 10,
        {
          width: quantityWidth - 7,
          align: "center",
        }
      );

      doc.text(
        formatMoney(invoiceData.ratePerNight),
        rateX,
        itemTopY + 10,
        {
          width: rateWidth - 7,
          align: "right",
        }
      );

      doc
        .font("Helvetica-Bold")
        .text(
          formatMoney(lineAmount),
          amountX,
          itemTopY + 10,
          {
            width: amountWidth - 7,
            align: "right",
          }
        );

      /*
       * Totals
       */
      const totalsStartY =
        itemTopY + itemRowHeight + 17;

      const totalsBoxWidth = 250;
      const totalsBoxX =
        leftMargin + contentWidth - totalsBoxWidth;

      const totalsLabelWidth = 110;
      const totalsValueWidth =
        totalsBoxWidth - totalsLabelWidth;

      const totalRow = (
        label: string,
        value: string,
        y: number,
        bold = false
      ): void => {
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(bold ? 10 : 8.5)
          .fillColor(
            bold ? primaryColor : "#555555"
          )
          .text(label, totalsBoxX, y, {
            width: totalsLabelWidth,
            align: "left",
          });

        doc.text(
          value,
          totalsBoxX + totalsLabelWidth,
          y,
          {
            width: totalsValueWidth,
            align: "right",
          }
        );
      };

      let currentTotalsY = totalsStartY;

      totalRow(
        "Subtotal",
        formatMoney(invoiceData.subtotal),
        currentTotalsY
      );

      currentTotalsY += 17;

      if (invoiceData.taxAmount > 0) {
        totalRow(
          `Tax (${invoiceData.taxRate}%)`,
          formatMoney(invoiceData.taxAmount),
          currentTotalsY
        );

        currentTotalsY += 17;
      }

      doc
        .moveTo(totalsBoxX, currentTotalsY)
        .lineTo(
          totalsBoxX + totalsBoxWidth,
          currentTotalsY
        )
        .strokeColor(accentColor)
        .lineWidth(0.8)
        .stroke();

      currentTotalsY += 9;

      totalRow(
        "Total",
        formatMoney(invoiceData.totalAmount),
        currentTotalsY,
        true
      );

      /*
       * Footer note
       */
      const footerBoxY = currentTotalsY + 35;
      const footerBoxHeight = 38;

      doc
        .rect(
          leftMargin,
          footerBoxY,
          contentWidth,
          footerBoxHeight
        )
        .fill(lightBackground);

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(primaryColor)
        .text(
          "Thank you for choosing FarmStayGo!",
          leftMargin + 10,
          footerBoxY + 8,
          {
            width: contentWidth - 20,
            align: "center",
          }
        );

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#555555")
        .text(
          "For questions, contact support@farmstaygo.com",
          leftMargin + 10,
          footerBoxY + 22,
          {
            width: contentWidth - 20,
            align: "center",
          }
        );

      doc.end();

      stream.on("finish", () => {
        resolve(outputPath);
      });

      stream.on("error", (error: Error) => {
        reject(error);
      });

      doc.on("error", (error: Error) => {
        reject(error);
      });
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error("Unable to generate invoice PDF")
      );
    }
  });
};

export const getInvoiceFilePath = (
  bookingId: string
): string => {
  const safeBookingId = bookingId.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  const filename = `invoice_${safeBookingId}.pdf`;

  return path.resolve(
    INVOICE_OUTPUT_DIR,
    filename
  );
};
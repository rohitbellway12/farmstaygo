import nodemailer from "nodemailer";

import prisma from "../config/database.js";

const SMTP_HOST = process.env.MAIL_HOST || "";
const SMTP_PORT = parseInt(process.env.MAIL_PORT || "587", 10);
const SMTP_USER = process.env.MAIL_USERNAME || "";
const SMTP_PASS = process.env.MAIL_PASSWORD || "";
const SMTP_FROM = process.env.MAIL_FROM_ADDRESS || "noreply@farmstaygo.com";
const SMTP_SECURE = process.env.MAIL_ENCRYPTION === "ssl";

let cachedSmtpSettings: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
} | null = null;

const getSmtpSettingsFromDb = async (): Promise<{
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
} | null> => {
  try {
    const [host, port, user, pass, from, encryption] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "smtp_host" } }),
      prisma.setting.findUnique({ where: { key: "smtp_port" } }),
      prisma.setting.findUnique({ where: { key: "smtp_username" } }),
      prisma.setting.findUnique({ where: { key: "smtp_password" } }),
      prisma.setting.findUnique({ where: { key: "smtp_from_address" } }),
      prisma.setting.findUnique({ where: { key: "smtp_encryption" } }),
    ]);

    const smtpHost = host?.value?.trim() || "";
    const smtpPort = parseInt(port?.value?.trim() || "587", 10);
    const smtpUser = user?.value?.trim() || "";
    const smtpPass = pass?.value?.trim() || "";
    const smtpFrom = from?.value?.trim() || SMTP_FROM;
    const smtpEncryption = encryption?.value?.trim()?.toLowerCase() || "";
    const smtpSecure = smtpEncryption === "ssl";

    if (!smtpHost || !smtpUser || !smtpPass) {
      return null;
    }

    return {
      host: smtpHost,
      port: Number.isNaN(smtpPort) ? 587 : smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
    };
  } catch (error) {
    console.error("Get SMTP settings from DB error:", error);
    return null;
  }
};

const getTransporter = async (): Promise<{
  transporter: nodemailer.Transporter<nodemailer.SentMessageInfo>;
  from: string;
}> => {
  const dbSettings = await getSmtpSettingsFromDb();

  if (dbSettings) {
    cachedSmtpSettings = dbSettings;
  }

  const settings = cachedSmtpSettings || {
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM,
  };

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
  });

  return {
    transporter,
    from: settings.from,
  };
};

export const clearSmtpCache = (): void => {
  cachedSmtpSettings = null;
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  const { transporter, from } = await getTransporter();

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export const sendBookingConfirmationEmail = async (
  to: string,
  guestName: string,
  bookingId: string,
  propertyTitle: string,
  checkIn: string,
  checkOut: string,
  totalNights: number,
  guests: number,
  rooms: number,
  totalAmount: string,
  currency: string,
  totalPaid: string = "0",
  remainingBalance: string = "0",
  paymentStatus: string = "PENDING"
): Promise<void> => {
  const html = buildBookingConfirmationHtml({
    guestName,
    bookingId,
    propertyTitle,
    checkIn,
    checkOut,
    totalNights,
    guests,
    rooms,
    totalAmount,
    currency,
    totalPaid,
    remainingBalance,
    paymentStatus,
  });

  await sendEmail(
    to,
    `Booking Confirmed — ${propertyTitle}`,
    html
  );
};

interface BookingConfirmationParams {
  guestName: string;
  bookingId: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  totalNights: number;
  guests: number;
  rooms: number;
  totalAmount: string;
  currency: string;
  totalPaid: string;
  remainingBalance: string;
  paymentStatus: string;
}

const buildBookingConfirmationHtml = ({
  guestName,
  bookingId,
  propertyTitle,
  checkIn,
  checkOut,
  totalNights,
  guests,
  rooms,
  totalAmount,
  currency,
  totalPaid,
  remainingBalance,
  paymentStatus,
}: BookingConfirmationParams): string => {
  const paymentStatusLabel = paymentStatus === "PAID"
    ? "Fully Paid"
    : paymentStatus === "PARTIAL"
      ? "Partially Paid"
      : paymentStatus === "PENDING_APPROVAL"
        ? "Pending Approval"
        : paymentStatus === "PENDING"
          ? "Payment Pending"
          : paymentStatus;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Your Booking Has Been Confirmed</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Hi ${guestName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                Your booking has been confirmed! Here are the details:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyTitle}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-In</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-Out</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Nights</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${totalNights}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Guests</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${guests}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Total Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;font-weight:bold;">${currency} ${totalAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment Status</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;font-weight:bold;">${paymentStatusLabel}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Total Paid</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#2d6a4f;font-weight:bold;">${currency} ${totalPaid}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Remaining Balance</td>
                  <td style="padding:12px 16px;font-size:14px;color:#c1121f;font-weight:bold;">${currency} ${remainingBalance}</td>
                </tr>
              </table>
              <p style="font-size:13px;color:#888888;margin:0;">
                If you have any questions about your booking, please contact us at support@farmstaygo.com.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              &copy; ${new Date().getFullYear()} FarmStayGo. All rights reserved.
            </td>
          </tr>
         </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendBookingRejectedCustomerEmail = async (params: {
  firstName: string;
  email: string;
  bookingId: string;
  propertyName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rejectionDate: string;
  rejectionReason: string;
  bookingDashboardUrl: string;
}): Promise<void> => {
  const html = buildBookingRejectedCustomerHtml(params);

  await sendEmail(params.email || params.firstName, `Booking Rejected — ${params.propertyName}`, html);
};

const buildBookingRejectedCustomerHtml = ({
  firstName,
  propertyName,
  location,
  checkIn,
  checkOut,
  guests,
  rejectionDate,
  rejectionReason,
  bookingDashboardUrl,
}: {
  firstName: string;
  propertyName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rejectionDate: string;
  rejectionReason: string;
  bookingDashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Rejected — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#c0392b;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#fadbd8;margin:4px 0 0;font-size:13px;">Booking Rejected</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">We regret to inform you that your booking request for <strong>${propertyName}</strong> has been rejected by the property owner. Below are the details for your reference.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Booking Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Location</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${location}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-out Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Guests</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${guests}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Rejection Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Rejection Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${rejectionDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Reason for Rejection</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${rejectionReason}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">We understand this may be disappointing. We encourage you to explore other similar properties on FarmStayGo that may be available for your dates.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${bookingDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Browse Similar Properties</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">If you have any questions or need assistance finding an alternative, our Customer Support team is always ready to help.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Warm Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendPropertySubmittedEmail = async (params: {
  firstName: string;
  email: string;
  propertyName: string;
  propertyId: string;
  submissionDate: string;
}): Promise<void> => {
  const html = buildPropertySubmittedHtml(params);

  await sendEmail(params.email, "Property Submitted Successfully – FarmStayGo", html);
};

const buildPropertySubmittedHtml = ({
  firstName,
  propertyName,
  propertyId,
  submissionDate,
}: {
  firstName: string;
  propertyName: string;
  propertyId: string;
  submissionDate: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Submitted Successfully – FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Property Submitted Successfully</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                Thank you for choosing FarmStayGo! We have successfully received your property submission. Your property is now under review by our team.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Submission Date</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${submissionDate}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>What Happens Next?</strong></p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;">Our team will review your property information, photos, amenities, and other details to ensure they meet our quality standards.</p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;">Once the review is complete, we will notify you of one of the following outcomes:</p>
              <ul style="font-size:14px;color:#333333;margin:0 0 24px;padding-left:20px;">
                <li><strong>Approved:</strong> Your property will be published on FarmStayGo and become available for guests to book.</li>
                <li><strong>Requires Changes:</strong> If any information is missing or needs correction, we'll contact you with the required updates.</li>
                <li><strong>Rejected:</strong> If your property does not meet our listing guidelines, we'll inform you of the reason.</li>
              </ul>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">You can log in to your FarmStayGo account at any time to view your property's status or update its information.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${LOGIN_URL}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Login Here</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">
                If you have any questions or need assistance, our support team is always happy to help.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for partnering with FarmStayGo. We look forward to helping you welcome more guests.<br />
              Best Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendProfileCompleteEmail = async (params: {
  firstName: string;
  email: string;
  profileUrl: string;
}): Promise<void> => {
  const html = buildProfileCompleteHtml(params);

  await sendEmail(params.email, "Complete Your Profile – FarmStayGo", html);
};

const buildProfileCompleteHtml = ({
  firstName,
  profileUrl,
}: {
  firstName: string;
  profileUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Profile – FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Complete Your Profile</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                Welcome to FarmStayGo! Your account has been created successfully, but your profile is not yet complete.
              </p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;">To enjoy all the features of FarmStayGo and list or manage your properties without interruption, please complete your profile.</p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>Please update the following information:</strong></p>
              <ul style="font-size:14px;color:#333333;margin:0 0 24px;padding-left:20px;">
                <li>Profile Photo</li>
                <li>Mobile Number</li>
                <li>Address</li>
                <li>Identity Verification (if applicable)</li>
                <li>Bank Account Details (for payouts)</li>
                <li>Property Owner Information</li>
              </ul>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">A complete profile helps us verify your account faster, improves guest trust, and ensures timely booking notifications and payments.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${profileUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Complete Your Profile</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">
                If you have already updated your profile, please ignore this email. Need help? Our support team is always here to assist you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for being a part of FarmStayGo.<br />
              Best Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendVerificationPendingEmail = async (params: {
  firstName: string;
  email: string;
  submissionDate: string;
  verificationId: string;
  dashboardUrl: string;
}): Promise<void> => {
  const html = buildVerificationPendingHtml(params);

  await sendEmail(params.email, "Verification Pending – FarmStayGo", html);
};

const buildVerificationPendingHtml = ({
  firstName,
  submissionDate,
  verificationId,
  dashboardUrl,
}: {
  firstName: string;
  submissionDate: string;
  verificationId: string;
  dashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Pending – FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Verification Pending</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                Thank you for joining FarmStayGo. Your account has been created successfully, and your verification request has been received. It is currently <strong>Pending Verification</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Account Status</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">Verification Pending</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Submitted On</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${submissionDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Verification ID</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${verificationId}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;">Our team is reviewing the information and documents you submitted. This process helps us maintain a trusted and secure platform for all guests and property owners.</p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>What Happens Next?</strong></p>
              <ul style="font-size:14px;color:#333333;margin:0 0 24px;padding-left:20px;">
                <li>Our verification team will review your details.</li>
                <li>If additional information or documents are required, we will contact you via email.</li>
                <li>Once your account is verified, you will receive a confirmation email, and all eligible features will be activated.</li>
              </ul>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">You can check your verification status anytime by logging in to your FarmStayGo account.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">View Verification Status</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">
                If you have any questions or need assistance, please contact our support team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for your patience and for choosing FarmStayGo. We look forward to welcoming you to our trusted community.<br />
              Best Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendVerifiedCongratulationEmail = async (params: {
  firstName: string;
  email: string;
  verificationDate: string;
  accountType: string;
  dashboardUrl: string;
}): Promise<void> => {
  const html = buildVerifiedCongratulationHtml(params);

  await sendEmail(params.email, "Congratulations! Your FarmStayGo Account is Verified", html);
};

const buildVerifiedCongratulationHtml = ({
  firstName,
  verificationDate,
  accountType,
  dashboardUrl,
}: {
  firstName: string;
  verificationDate: string;
  accountType: string;
  dashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations! Your FarmStayGo Account is Verified</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Account Verified Successfully</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                Congratulations! We're delighted to inform you that your FarmStayGo account has been successfully verified.
              </p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;">Your verification is now complete, and you have full access to the features available on the platform.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Account Status</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">Verified</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Verification Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${verificationDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Account Type</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${accountType}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>You Can Now:</strong></p>
              <ul style="font-size:14px;color:#333333;margin:0 0 24px;padding-left:20px;">
                <li>Access your FarmStayGo dashboard.</li>
                <li>Book or manage farm stays and villas.</li>
                <li>List and manage your properties (for Hosts).</li>
                <li>Receive booking requests and notifications.</li>
                <li>Update your profile and account settings.</li>
              </ul>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Access Your Dashboard</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">
                Thank you for completing the verification process and becoming a trusted member of the FarmStayGo community. If you have any questions or need assistance, our support team is always here to help.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for choosing FarmStayGo.<br />
              Best Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendContactMessageNotificationEmail = async (
  to: string,
  contact: {
    name: string;
    email: string;
    phone?: string | null;
    subject: string;
    message: string;
  }
): Promise<void> => {
  const html = buildContactMessageHtml(contact);

  await sendEmail(
    to,
    `New Contact Message — ${contact.subject}`,
    html
  );
};

interface ContactMessageParams {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}

const buildContactMessageHtml = ({
  name,
  email,
  phone,
  subject,
  message,
}: ContactMessageParams): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Message</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">New Contact Message Received</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Email</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Phone</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${phone || "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Subject</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${subject}</td>
                </tr>
              </table>
              <p style="font-size:13px;color:#555555;margin:0 0 8px;">Message</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;">
                <tr>
                  <td style="padding:16px;font-size:14px;color:#333333;line-height:1.6;">${message.replace(/\n/g, "<br/>")}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              &copy; ${new Date().getFullYear()} FarmStayGo. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const WEBSITE_URL = process.env.WEBSITE_URL || "https://farmstaygo.com";
const LOGIN_URL = `${WEBSITE_URL}/login`;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@farmstaygo.com";
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || "";
const BOOKING_EMAIL = process.env.BOOKING_EMAIL || process.env.MAIL_FROM_ADDRESS || "noreply@farmstaygo.com";

export const sendAccountCreatedEmail = async (params: {
  firstName: string;
  lastName?: string | null;
  email: string;
  role: string;
}): Promise<void> => {
  const fullName = [params.firstName, params.lastName].filter(Boolean).join(" ");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Welcome to FarmStayGo!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${params.firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                Your account has been created successfully. We're excited to have you as part of our community.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Email Address</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${params.email}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">You can now log in to your account and start exploring unique farm stays, villas, and nature retreats.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>What you can do with your account:</strong></p>
              <ul style="font-size:14px;color:#333333;margin:0 0 24px;padding-left:20px;">
                <li>Search and book farm stays and villas.</li>
                <li>Save your favorite properties.</li>
                <li>Manage your bookings.</li>
                <li>View your booking history.</li>
                <li>Contact property hosts directly.</li>
              </ul>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${LOGIN_URL}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Login Here</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">
                If you have any questions or need assistance, feel free to contact our support team at <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for choosing FarmStayGo.<br />
              Best Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendEmail(params.email, "Welcome to FarmStayGo!", html);
};

const buildPasswordResetHtml = ({
  firstName,
  resetLink,
  expiryMinutes = 30,
}: {
  firstName: string;
  resetLink: string;
  expiryMinutes?: number;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your FarmStayGo Password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Reset Your FarmStayGo Password</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                We received a request to reset the password for your FarmStayGo account.
              </p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                To create a new password, please click the button below:
              </p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0 0 24px;">
                Or copy and paste this link into your browser:<br />
                <a href="${resetLink}" style="color:#2d6a4f;text-decoration:none;word-break:break-all;">${resetLink}</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0 0 24px;">
                This password reset link will expire in ${expiryMinutes} minutes for security reasons.
              </p>
              <p style="font-size:13px;color:#888888;margin:0 0 24px;">
                If you did not request a password reset, you can safely ignore this email. Your account will remain secure, and no changes will be made.
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">
                If you continue to experience issues, please contact our support team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Warm Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendBookingCancelledCustomerEmail = async (params: {
  firstName: string;
  email: string;
  bookingId: string;
  propertyName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  cancellationDate: string;
  cancellationReason: string;
  refundStatus: string;
  refundAmount: string;
  refundTimeline: string;
  bookingDashboardUrl: string;
}): Promise<void> => {
  const html = buildBookingCancelledCustomerHtml(params);

  await sendEmail(params.email || params.firstName, `Booking Cancelled — ${params.propertyName}`, html);
};

const buildBookingCancelledCustomerHtml = ({
  firstName,
  bookingId,
  propertyName,
  location,
  checkIn,
  checkOut,
  guests,
  cancellationDate,
  cancellationReason,
  refundStatus,
  refundAmount,
  refundTimeline,
  bookingDashboardUrl,
}: {
  firstName: string;
  bookingId: string;
  propertyName: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  cancellationDate: string;
  cancellationReason: string;
  refundStatus: string;
  refundAmount: string;
  refundTimeline: string;
  bookingDashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Cancelled — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#c0392b;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#fadbd8;margin:4px 0 0;font-size:13px;">Booking Cancelled</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">We regret to inform you that your booking with FarmStayGo has been cancelled. Below are the details of your cancelled reservation for your reference.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Booking Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Location</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${location}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-out Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Guests</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${guests}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Cancellation Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Cancellation Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${cancellationDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Cancellation Status</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">Cancelled</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Reason for Cancellation</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${cancellationReason}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Refund Information</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Refund Status</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${refundStatus}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Refund Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${refundAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Estimated Processing Time</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${refundTimeline}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">If you are eligible for a refund, it will be processed through your original payment method. Depending on your bank or payment provider, the amount may take a few business days to appear in your account.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${bookingDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Manage Your Bookings</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">We sincerely apologize for any inconvenience this cancellation may have caused. We value your trust and hope to welcome you on a future trip.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Warm Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendRatingReceivedAdminEmail = async (params: {
  ownerName: string;
  propertyName: string;
  bookingId: string;
  guestName: string;
  reviewDate: string;
  overallRating: number;
  guestReview: string;
  ownerDashboardUrl: string;
}): Promise<void> => {
  const html = buildRatingReceivedAdminHtml(params);

  await sendEmail(BOOKING_EMAIL, `New Rating Received — ${params.propertyName}`, html);
};

const buildRatingReceivedAdminHtml = ({
  ownerName,
  propertyName,
  bookingId,
  guestName,
  reviewDate,
  overallRating,
  guestReview,
  ownerDashboardUrl,
}: {
  ownerName: string;
  propertyName: string;
  bookingId: string;
  guestName: string;
  reviewDate: string;
  overallRating: number;
  guestReview: string;
  ownerDashboardUrl: string;
}): string => {
  const stars = "⭐".repeat(overallRating);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Rating Received — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#f39c12;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#fef5e7;margin:4px 0 0;font-size:13px;">New Rating Received</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${ownerName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">Great news! Your property has received a new guest rating and review on FarmStayGo. Guest feedback plays an important role in building trust and improving your property's visibility on our platform.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Review Summary</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Guest Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${guestName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Review Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${reviewDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Guest Rating</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${stars} ${overallRating} / 5</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Guest Review</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;font-size:14px;color:#333333;line-height:1.6;font-style:italic;">"${guestReview}"</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${ownerDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#f39c12;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">View &amp; Respond to Review</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Kind Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendRatingForStayCustomerEmail = async (params: {
  firstName: string;
  email: string;
  propertyName: string;
  bookingId: string;
  checkIn: string;
  checkOut: string;
  ratingUrl: string;
}): Promise<void> => {
  const html = buildRatingForStayCustomerHtml(params);

  await sendEmail(params.email || params.firstName, `Rate Your Stay — ${params.propertyName}`, html);
};

const buildRatingForStayCustomerHtml = ({
  firstName,
  propertyName,
  bookingId,
  checkIn,
  checkOut,
  ratingUrl,
}: {
  firstName: string;
  propertyName: string;
  bookingId: string;
  checkIn: string;
  checkOut: string;
  ratingUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rate Your Stay — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#f39c12;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#fef5e7;margin:4px 0 0;font-size:13px;">Rate Your Stay</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">We hope you had a wonderful stay at ${propertyName}. Thank you for choosing FarmStayGo for your getaway. We would love to hear about your experience and learn how we can continue to improve our services.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">Your feedback helps other travelers make better decisions and helps our property partners provide exceptional hospitality.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Share Your Stay Experience</strong></p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;">Please take a moment to rate your stay and share your valuable feedback.</p>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>Your Stay Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Stay Date</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${checkIn} to ${checkOut}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${ratingUrl}" style="display:inline-block;padding:12px 24px;background-color:#f39c12;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Rate Your Stay</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">Your review only takes a few minutes and makes a big difference to our community.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Warm Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendRegistrationSuccessfulCustomerEmail = async (params: {
  firstName: string;
  fullName: string;
  email: string;
  registrationDate: string;
  loginUrl: string;
}): Promise<void> => {
  const html = buildRegistrationSuccessfulCustomerHtml(params);

  await sendEmail(params.email || params.firstName, `Welcome to FarmStayGo — Registration Successful`, html);
};

const buildRegistrationSuccessfulCustomerHtml = ({
  firstName,
  fullName,
  email,
  registrationDate,
  loginUrl,
}: {
  firstName: string;
  fullName: string;
  email: string;
  registrationDate: string;
  loginUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FarmStayGo — Registration Successful</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#27ae60;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d5f5e3;margin:4px 0 0;font-size:13px;">Welcome to FarmStayGo</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">Welcome to FarmStayGo! We are delighted to inform you that your registration has been completed successfully. Thank you for joining our community of travelers and experience seekers.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Registration Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${fullName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Email Address</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Registration Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${registrationDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Account Status</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">Active</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">You can now explore and book unique farm stays, villas, and nature retreats through your FarmStayGo account.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background-color:#27ae60;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Login to Your Account</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">If you have any questions or need assistance, our support team is always happy to help.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Warm Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendPasswordResetEmail = async (params: {
  firstName: string;
  email: string;
  resetLink: string;
  expiryMinutes?: number;
}): Promise<void> => {
  const html = buildPasswordResetHtml({
    firstName: params.firstName,
    resetLink: params.resetLink,
    expiryMinutes: params.expiryMinutes ?? 30,
  });

  await sendEmail(params.email, "Reset Your FarmStayGo Password", html);
};

export const sendEnquiryReceivedEmail = async (params: {
  email: string;
  firstName: string;
  enquiryId: string;
  propertyName: string;
  propertyLocation: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  submissionDate: string;
  dashboardUrl: string;
}): Promise<void> => {
  const html = buildEnquiryReceivedHtml(params);

  await sendEmail(
    params.email,
    "Enquiry Received – FarmStayGo",
    html
  );
};

interface EnquiryReceivedParams {
  email: string;
  firstName: string;
  enquiryId: string;
  propertyName: string;
  propertyLocation: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  submissionDate: string;
  dashboardUrl: string;
}

const buildEnquiryReceivedHtml = ({
  firstName,
  enquiryId,
  propertyName,
  propertyLocation,
  checkIn,
  checkOut,
  guests,
  submissionDate,
  dashboardUrl,
}: EnquiryReceivedParams): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enquiry Received – FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Enquiry Received</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                Thank you for contacting FarmStayGo. We have successfully received your enquiry and appreciate your interest. Our team is reviewing your request and will get back to you as soon as possible.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Enquiry ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${enquiryId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Location</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyLocation}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-out Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Guests</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${guests}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Submitted On</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${submissionDate}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>What Happens Next?</strong></p>
              <ul style="font-size:14px;color:#333333;margin:0 0 24px;padding-left:20px;">
                <li>Our team or the property host will review your enquiry.</li>
                <li>We'll contact you with availability, pricing, and any additional information you may need.</li>
                <li>If your preferred dates are unavailable, we'll do our best to suggest suitable alternatives.</li>
              </ul>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">You can log in to your FarmStayGo account anytime to track the status of your enquiry.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">View Your Enquiry</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">
                If you have any questions or would like to update your enquiry, please contact our support team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for choosing FarmStayGo. We look forward to helping you plan a memorable stay.<br />
              Best Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendEnquiryAdminEmail = async (params: {
  enquiryId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertyName: string;
  propertyId: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message: string;
  dateTime: string;
  adminDashboardUrl: string;
}): Promise<void> => {
  const html = buildEnquiryAdminHtml(params);

  await sendEmail(BOOKING_EMAIL, `New Enquiry Received — ${params.propertyName}`, html);
};

const buildEnquiryAdminHtml = ({
  enquiryId,
  customerName,
  customerEmail,
  customerPhone,
  propertyName,
  propertyId,
  location,
  checkIn,
  checkOut,
  guests,
  message,
  dateTime,
  adminDashboardUrl,
}: {
  enquiryId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertyName: string;
  propertyId: string;
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message: string;
  dateTime: string;
  adminDashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Enquiry Received — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">New Enquiry Received</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear Admin,</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">A new property enquiry has been received on FarmStayGo. Please review the details below and take the necessary action to ensure a timely response to the customer.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Enquiry ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${enquiryId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Date &amp; Time</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${dateTime}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Status</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">New Enquiry</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Customer Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Email</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Phone Number</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${customerPhone}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Property Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Location</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${location}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Stay Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-out Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Number of Guests</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${guests}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Customer Message</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;font-size:14px;color:#333333;line-height:1.6;">${message.replace(/\n/g, "<br/>")}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>Action Required</strong></p>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">Please review the enquiry and contact the customer or property owner as soon as possible. Prompt responses help improve customer satisfaction and increase booking conversions.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${adminDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Access Admin Dashboard</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">If you require any additional information, please review the enquiry in the admin panel.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for your prompt attention.<br />
              Kind Regards,<br />
              FarmStayGo Team<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendBookingConfirmedAdminEmail = async (params: {
  bookingId: string;
  bookingDateTime: string;
  paymentStatus: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyName: string;
  propertyId: string;
  location: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  bookingAmount: string;
  amountPaid: string;
  balanceAmount: string;
  paymentMethod: string;
  transactionId: string;
  adminDashboardUrl: string;
}): Promise<void> => {
  const html = buildBookingConfirmedAdminHtml(params);

  await sendEmail(BOOKING_EMAIL, `Booking Confirmed — ${params.propertyName}`, html);
};

const buildBookingConfirmedAdminHtml = ({
  bookingId,
  bookingDateTime,
  paymentStatus,
  guestName,
  guestEmail,
  guestPhone,
  propertyName,
  propertyId,
  location,
  checkIn,
  checkOut,
  nights,
  adults,
  children,
  bookingAmount,
  amountPaid,
  balanceAmount,
  paymentMethod,
  transactionId,
  adminDashboardUrl,
}: {
  bookingId: string;
  bookingDateTime: string;
  paymentStatus: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyName: string;
  propertyId: string;
  location: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  bookingAmount: string;
  amountPaid: string;
  balanceAmount: string;
  paymentMethod: string;
  transactionId: string;
  adminDashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Booking Confirmed</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear Admin,</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">We are pleased to inform you that a new booking has been successfully confirmed on FarmStayGo. Please review the reservation details below and ensure all necessary arrangements are coordinated with the property owner to provide a seamless guest experience.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking Date &amp; Time</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingDateTime}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking Status</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">Confirmed</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Payment Status</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${paymentStatus}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Guest Information</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Guest Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${guestName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Email Address</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${guestEmail}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Phone Number</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${guestPhone}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Property Information</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Location</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${location}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Stay Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-out Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Duration</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${nights} Night(s)</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Guests</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${adults} Adult(s), ${children} Child(ren)</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Payment Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${bookingAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Amount Received</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${amountPaid}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Balance Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${balanceAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment Method</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Transaction ID</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${transactionId}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>Action Required</strong></p>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">Please verify the booking details, notify the property owner if required, and ensure the property is prepared before the guest's arrival. Monitor the booking through the admin dashboard and assist with any customer or host queries.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${adminDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Open Admin Dashboard</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for helping us deliver exceptional hospitality and a smooth booking experience.<br />
              Kind Regards,<br />
              FarmStayGo Team<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendBookingConfirmedCustomerEmail = async (params: {
  firstName: string;
  email: string;
  bookingId: string;
  bookingDate: string;
  propertyName: string;
  propertyAddress: string;
  hostName: string;
  hostPhone: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  nights: number;
  adults: number;
  children: number;
  totalAmount: string;
  amountPaid: string;
  balanceAmount: string;
  paymentMethod: string;
  bookingUrl: string;
}): Promise<void> => {
  const html = buildBookingConfirmedCustomerHtml(params);

  await sendEmail(params.email || params.firstName, `Booking Confirmed — ${params.propertyName}`, html);
};

const buildBookingConfirmedCustomerHtml = ({
  firstName,
  bookingId,
  bookingDate,
  propertyName,
  propertyAddress,
  hostName,
  hostPhone,
  checkIn,
  checkOut,
  checkInTime,
  checkOutTime,
  nights,
  adults,
  children,
  totalAmount,
  amountPaid,
  balanceAmount,
  paymentMethod,
  bookingUrl,
}: {
  firstName: string;
  bookingId: string;
  bookingDate: string;
  propertyName: string;
  propertyAddress: string;
  hostName: string;
  hostPhone: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  nights: number;
  adults: number;
  children: number;
  totalAmount: string;
  amountPaid: string;
  balanceAmount: string;
  paymentMethod: string;
  bookingUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Booking Confirmed</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">Congratulations! Your booking has been confirmed. Thank you for choosing FarmStayGo. We're delighted to be a part of your upcoming getaway and look forward to hosting you.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">Your reservation has been successfully confirmed. Please find your booking details below.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Booking Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Booking Status</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">✅ Confirmed</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Property Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Address</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyAddress}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Host Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${hostName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Host Contact</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${hostPhone}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Stay Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn} (${checkInTime})</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-out</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut} (${checkOutTime})</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Duration</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${nights} Night(s)</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Guests</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${adults} Adult(s), ${children} Child(ren)</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Payment Summary</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Total Booking Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${totalAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Amount Paid</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${amountPaid}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Balance Amount</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">₹${balanceAmount}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>Before You Arrive</strong></p>
              <ul style="font-size:14px;color:#333333;margin:0 0 24px;padding-left:20px;">
                <li>Carry a valid government-issued photo ID for all adult guests.</li>
                <li>Please follow the property's check-in and house rules.</li>
                <li>Contact the host if you expect to arrive later than your scheduled check-in time.</li>
                <li>Review the property's amenities and directions before your trip.</li>
              </ul>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${bookingUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Manage Booking</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">We wish you a relaxing and memorable stay. Thank you for trusting FarmStayGo to make your travel experience special.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Warm Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendPaymentReceivedAdminEmail = async (params: {
  paymentId: string;
  transactionId: string;
  paymentDateTime: string;
  bookingId: string;
  propertyName: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalBookingAmount: string;
  amountReceived: string;
  balanceAmount: string;
  paymentMethod: string;
  gateway: string;
  referenceNumber: string;
  adminDashboardUrl: string;
}): Promise<void> => {
  const html = buildPaymentReceivedAdminHtml(params);

  await sendEmail(BOOKING_EMAIL, `Payment Received — ${params.propertyName}`, html);
};

const buildPaymentReceivedAdminHtml = ({
  paymentId,
  transactionId,
  paymentDateTime,
  bookingId,
  propertyName,
  propertyId,
  guestName,
  checkIn,
  checkOut,
  totalBookingAmount,
  amountReceived,
  balanceAmount,
  paymentMethod,
  gateway,
  referenceNumber,
  adminDashboardUrl,
}: {
  paymentId: string;
  transactionId: string;
  paymentDateTime: string;
  bookingId: string;
  propertyName: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalBookingAmount: string;
  amountReceived: string;
  balanceAmount: string;
  paymentMethod: string;
  gateway: string;
  referenceNumber: string;
  adminDashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Payment Received</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear Admin,</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">A payment has been successfully received for a booking on FarmStayGo. Please review the transaction details below and verify that the booking status has been updated accordingly.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Payment Summary</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${paymentId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Transaction ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${transactionId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment Date &amp; Time</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${paymentDateTime}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Payment Status</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">✅ Successful</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Booking Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Guest Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${guestName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Check-out Date</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Payment Information</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Total Booking Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${totalBookingAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Amount Received</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${amountReceived}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Balance Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${balanceAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment Method</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Gateway</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${gateway}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Reference Number</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${referenceNumber}</td>
                </tr>
              </table>
              <p style="font-size:14px;color:#333333;margin:0 0 16px;"><strong>Action Required</strong></p>
              <p style="font-size:14px;color:#333333;margin:0 0 24px;">Please verify the payment in the admin dashboard and ensure the booking record reflects the latest payment status. If applicable, notify the property owner and proceed with the standard booking fulfillment process.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${adminDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Access Admin Dashboard</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">If you notice any discrepancies with the payment or booking information, please investigate the transaction promptly.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Thank you for helping us maintain a smooth and secure booking experience.<br />
              Kind Regards,<br />
              FarmStayGo Team<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendPaymentReceivedCustomerEmail = async (params: {
  firstName: string;
  email: string;
  paymentDate: string;
  paymentId: string;
  transactionId: string;
  bookingId: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalBookingAmount: string;
  amountPaid: string;
  balanceAmount: string;
  paymentMethod: string;
  bookingDashboardUrl: string;
}): Promise<void> => {
  const html = buildPaymentReceivedCustomerHtml(params);

  await sendEmail(params.email || params.firstName, `Payment Received — ${params.propertyName}`, html);
};

const buildPaymentReceivedCustomerHtml = ({
  firstName,
  paymentDate,
  paymentId,
  transactionId,
  bookingId,
  propertyName,
  checkIn,
  checkOut,
  guests,
  totalBookingAmount,
  amountPaid,
  balanceAmount,
  paymentMethod,
  bookingDashboardUrl,
}: {
  firstName: string;
  paymentDate: string;
  paymentId: string;
  transactionId: string;
  bookingId: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalBookingAmount: string;
  amountPaid: string;
  balanceAmount: string;
  paymentMethod: string;
  bookingDashboardUrl: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received — FarmStayGo</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#2d6a4f;padding:24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">FarmStayGo</h1>
              <p style="color:#d8f3dc;margin:4px 0 0;font-size:13px;">Payment Received</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="font-size:15px;color:#333333;margin:0 0 16px;">Dear ${firstName},</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">Thank you for your payment! We are pleased to confirm that we have successfully received your payment for your FarmStayGo booking. Your transaction has been processed successfully, and your booking is now confirmed.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Payment Confirmation</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment Status</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">✅ Successful</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${paymentDate}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Payment ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${paymentId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Transaction ID</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${transactionId}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Booking Details</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Booking ID</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${bookingId}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Property Name</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-in Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkIn}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Check-out Date</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">${checkOut}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Guests</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">${guests}</td>
                </tr>
              </table>
              <p style="font-size:15px;color:#333333;margin:0 0 16px;"><strong>Payment Summary</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Total Booking Amount</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${totalBookingAmount}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;border-bottom:1px solid #e0e0e0;font-weight:bold;color:#555555;font-size:13px;">Amount Paid</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #e0e0e0;font-size:14px;color:#333333;">₹${amountPaid}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;background-color:#f8f9fa;font-weight:bold;color:#555555;font-size:13px;">Balance Amount</td>
                  <td style="padding:12px 16px;font-size:14px;color:#333333;">₹${balanceAmount}</td>
                </tr>
              </table>
              <p style="font-size:13px;color:#888888;margin:0 0 24px;">A copy of your payment receipt has been recorded in your account and can be accessed anytime from your booking dashboard.</p>
              <p style="font-size:15px;color:#333333;margin:0 0 24px;">
                <a href="${bookingDashboardUrl}" style="display:inline-block;padding:12px 24px;background-color:#2d6a4f;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">View Booking &amp; Receipt</a>
              </p>
              <p style="font-size:13px;color:#888888;margin:0;">If there is any remaining balance, it must be paid according to the property's payment policy before or at check-in.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#999999;">
              Warm Regards,<br />
              Team FarmStayGo<br />
              <a href="${WEBSITE_URL}" style="color:#2d6a4f;text-decoration:none;">${WEBSITE_URL}</a> | <a href="mailto:${SUPPORT_EMAIL}" style="color:#2d6a4f;text-decoration:none;">${SUPPORT_EMAIL}</a>${SUPPORT_PHONE ? ` | ${SUPPORT_PHONE}` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

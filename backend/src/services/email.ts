import nodemailer from "nodemailer";

const SMTP_HOST = process.env.MAIL_HOST || "";
const SMTP_PORT = parseInt(process.env.MAIL_PORT || "587", 10);
const SMTP_USER = process.env.MAIL_USERNAME || "";
const SMTP_PASS = process.env.MAIL_PASSWORD || "";
const SMTP_FROM = process.env.MAIL_FROM_ADDRESS || "noreply@farmstaygo.com";
const SMTP_SECURE = process.env.MAIL_ENCRYPTION === "ssl";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  await transporter.sendMail({
    from: SMTP_FROM,
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

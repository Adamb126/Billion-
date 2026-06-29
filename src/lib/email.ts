// Booking confirmation emails.
//
// When SMTP is configured we send via Nodemailer. When it isn't (local dev),
// we log the email to the server console so the flow is still fully testable.

import nodemailer from "nodemailer";
import { env, emailEnabled } from "./env";
import { formatMoney } from "./money";
import { formatDateTime } from "./time";

type ConfirmationDetails = {
  clientName: string;
  clientEmail: string;
  serviceName: string;
  startTime: Date;
  amountCents: number;
  currency: string;
};

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth:
        env.smtpUser || env.smtpPassword
          ? { user: env.smtpUser, pass: env.smtpPassword }
          : undefined,
    });
  }
  return transporter;
}

export async function sendBookingConfirmation(
  details: ConfirmationDetails,
): Promise<void> {
  const subject = `Booking confirmed — ${details.serviceName} at ${env.studioName}`;
  const when = formatDateTime(details.startTime);
  const amount = formatMoney(details.amountCents, details.currency);

  const text = [
    `Hi ${details.clientName},`,
    ``,
    `Your booking at ${env.studioName} is confirmed. We look forward to seeing you!`,
    ``,
    `  Service: ${details.serviceName}`,
    `  When:    ${when}`,
    `  Paid:    ${amount}`,
    ``,
    `If you need to change or cancel, just reply to this email.`,
    ``,
    `See you soon,`,
    `${env.studioName}`,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
      <h2 style="color:#0e7490;">Booking confirmed ✅</h2>
      <p>Hi ${escapeHtml(details.clientName)},</p>
      <p>Your booking at <strong>${escapeHtml(env.studioName)}</strong> is confirmed. We look forward to seeing you!</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Service</td><td style="padding:4px 0;"><strong>${escapeHtml(details.serviceName)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b;">When</td><td style="padding:4px 0;"><strong>${escapeHtml(when)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Paid</td><td style="padding:4px 0;"><strong>${escapeHtml(amount)}</strong></td></tr>
      </table>
      <p style="color:#64748b;font-size:14px;">If you need to change or cancel, just reply to this email.</p>
      <p>See you soon,<br/>${escapeHtml(env.studioName)}</p>
    </div>`;

  if (!emailEnabled) {
    // Dev fallback: log instead of sending.
    console.log(
      "\n----- [DEV EMAIL] booking confirmation -----\n" +
        `To: ${details.clientEmail}\n` +
        `Subject: ${subject}\n\n` +
        text +
        "\n--------------------------------------------\n",
    );
    return;
  }

  try {
    await getTransporter().sendMail({
      from: env.emailFrom,
      to: details.clientEmail,
      subject,
      text,
      html,
    });
  } catch (err) {
    // Never let an email failure break a confirmed booking — log and move on.
    console.error("Failed to send confirmation email:", err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

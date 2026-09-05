import nodemailer from "nodemailer";

export const MASTER_EMAIL = process.env.MASTER_EMAIL || "anjumanearaianfaisalabad@gmail.com";
export const INFO_EMAIL = process.env.INFO_EMAIL || "info@anjumanearaian.org";

function transporter() {
  const user = process.env.GMAIL_USER || MASTER_EMAIL;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  const mailer = transporter();
  if (!mailer) {
    if (process.env.NODE_ENV !== "production") console.info(`[email preview] ${to}: ${subject}`);
    return { sent: false, reason: "GMAIL_APP_PASSWORD is not configured" };
  }
  await mailer.sendMail({
    from: `Anjuman-e-Araian Faisalabad <${process.env.GMAIL_USER || MASTER_EMAIL}>`,
    to,
    replyTo: INFO_EMAIL,
    subject,
    html,
  });
  return { sent: true };
}

export function emailFrame(title: string, body: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden"><div style="background:#1a4d2e;color:#fff;padding:22px"><h2 style="margin:0">${title}</h2></div><div style="padding:24px;color:#374151;line-height:1.7">${body}<p style="margin-top:24px;color:#6b7280">Anjuman-e-Araian Faisalabad<br>${INFO_EMAIL}</p></div></div>`;
}

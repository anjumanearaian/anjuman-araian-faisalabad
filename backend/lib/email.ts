import nodemailer from "nodemailer";

export const MASTER_EMAIL =
  process.env.MASTER_EMAIL || "anjumanearaianfaisalabad@gmail.com";

export const INFO_EMAIL =
  process.env.INFO_EMAIL || "info@anjumanearaian.org";


function transporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  });
}


export async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  const mailer = transporter();

  if (!mailer) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email preview] ${to}: ${subject}`);
    }

    return {
      sent: false,
      reason: "SMTP credentials are not configured",
    };
  }


  await mailer.sendMail({

    from: `Anjuman-e-Araian Faisalabad <${process.env.EMAIL_FROM || MASTER_EMAIL}>`,

    to,

    replyTo: INFO_EMAIL,

    subject,

    html,

  });


  return {
    sent: true,
  };
}



export function emailFrame(title: string, body: string) {

  return `
  <div style="
  font-family:Arial,sans-serif;
  max-width:620px;
  margin:auto;
  border:1px solid #e5e7eb;
  border-radius:14px;
  overflow:hidden">

  <div style="
  background:#1a4d2e;
  color:#fff;
  padding:22px">

  <h2 style="margin:0">${title}</h2>

  </div>


  <div style="
  padding:24px;
  color:#374151;
  line-height:1.7">

  ${body}


  <p style="
  margin-top:24px;
  color:#6b7280">

  Anjuman-e-Araian Faisalabad<br>
  ${INFO_EMAIL}

  </p>

  </div>

  </div>`;
}

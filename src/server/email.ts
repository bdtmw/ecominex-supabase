import nodemailer, { type Transporter } from "nodemailer";
import { env, optionalEnv } from "./env";
import { escapeHtml } from "./http";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = optionalEnv("SMTP_HOST");
    transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(optionalEnv("SMTP_PORT") || 587),
          secure: optionalEnv("SMTP_SECURE") === "true",
          auth: { user: env("SMTP_USER"), pass: env("SMTP_PASSWORD") },
        })
      : nodemailer.createTransport({ service: "gmail", auth: { user: env("MAIL_EMAIL"), pass: env("MAIL_PASSWORD") } });
  }
  return transporter;
}

const BRAND = "Ecomine X";
/** Shown as the sender name in every inbox: "Ecomine X <no-reply@ecominex.net>". */
const fromName = () => optionalEnv("MAIL_FROM_NAME") || BRAND;
/** System emails come from a no-reply address; replies are routed to the info@ mailbox. */
const from = () => optionalEnv("MAIL_FROM") || "no-reply@ecominex.net";
const replyTo = () => optionalEnv("MAIL_REPLY_TO") || "info@ecominex.net";

// Website theme: green gradient surface (same as the dashboard tiles), #1b1b1b cards, green accent, Poppins.
const GREEN = "#22c55e", GREEN_LIGHT = "#4ade80";
const FONT = "Poppins,system-ui,-apple-system,'Segoe UI',Arial,sans-serif";

/** Wraps content in the branded Ecomine X card used by all transactional emails. */
export function layout(title: string, body: string): string {
  return `
<div style="margin:0;padding:0;background-color:#0b4a24;background-image:linear-gradient(180deg,#1dae52 0%,#08381a 100%);font-family:${FONT};color:#e5e7eb;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:22px;">
      <span style="font-size:30px;font-weight:700;color:#ffffff;letter-spacing:0.2px;vertical-align:middle;">Ecomine</span>
      <span style="display:inline-block;width:30px;height:30px;line-height:30px;border-radius:50%;background:#ffffff;color:#16a34a;font-size:17px;font-weight:800;text-align:center;vertical-align:middle;margin-left:6px;">X</span>
    </div>
    <div style="background:#1b1b1b;border-radius:20px;border:1px solid rgba(255,255,255,0.08);padding:30px 26px 24px;box-shadow:0 12px 32px rgba(0,0,0,0.25);">
      <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h2>
      ${body}
    </div>
    <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.75);text-align:center;">© ${new Date().getFullYear()} Ecomine X. All rights reserved.<br>This is an automated message from a no-reply address. Need help? Write to ${escapeHtml(replyTo())}.</p>
  </div>
</div>`;
}

export const p = (text: string) => `<p style="margin:0 0 14px 0;font-size:14px;color:#d1d5db;line-height:1.7;">${text}</p>`;

export async function sendEmail(to: string, subject: string, html: string) {
  await getTransporter().sendMail({ from: { name: fromName(), address: from() }, replyTo: replyTo(), to, subject, html });
}

export const otpEmail = (code: string, purpose: "signup" | "login") =>
  layout(
    purpose === "signup" ? "Verify your email" : "Your login code",
    p("Use the code below to complete your verification:") +
      `<div style="margin:0 0 18px 0;text-align:center;"><span style="display:inline-block;padding:12px 28px;border-radius:14px;background:#111111;border:1px solid rgba(34,197,94,0.6);color:#4ade80;font-size:26px;font-weight:700;letter-spacing:8px;">${escapeHtml(code)}</span></div>` +
      p("This code expires in 5 minutes. If you did not request it, you can ignore this email.")
  );

export const resetEmail = (name: string, url: string) =>
  layout(
    "Reset Your Password",
    p(`Hi ${escapeHtml(name) || "there"},`) +
      p("We received a request to reset the password for your Ecomine X account.") +
      `<div style="margin:0 0 18px 0;text-align:center;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 28px;border-radius:12px;background-color:#22c55e;background-image:linear-gradient(180deg,#22c55e,#16a34a);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Reset Password</a></div>` +
      p(`Or copy this link into your browser:<br><span style="word-break:break-all;color:#9ca3af;font-size:12px;">${escapeHtml(url)}</span>`) +
      p("This link expires in 10 minutes. If you did not request a reset, you can ignore this email.")
  );

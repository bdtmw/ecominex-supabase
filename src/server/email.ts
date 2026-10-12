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

const from = () => optionalEnv("MAIL_FROM") || optionalEnv("SMTP_USER") || optionalEnv("MAIL_EMAIL") || "no-reply@example.com";

/** Wraps content in the branded dark card used by all transactional emails. */
export function layout(title: string, body: string): string {
  return `
<div style="margin:0;padding:0;background:#050810;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;margin-bottom:20px;">
      <span style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.35);color:#4ade80;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">The Eco Mining</span>
    </div>
    <div style="background:#050816;border-radius:16px;border:1px solid #1f2937;padding:24px 20px 20px;">
      <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#4ade80;">${escapeHtml(title)}</h2>
      ${body}
    </div>
    <p style="margin:16px 0 0 0;font-size:11px;color:#6b7280;text-align:center;">© ${new Date().getFullYear()} The Eco Mining. All rights reserved.</p>
  </div>
</div>`;
}

export const p = (text: string) => `<p style="margin:0 0 12px 0;font-size:14px;color:#d1d5db;line-height:1.6;">${text}</p>`;

export async function sendEmail(to: string, subject: string, html: string) {
  await getTransporter().sendMail({ from: `"The Eco Mining" <${from()}>`, to, subject, html });
}

export const otpEmail = (code: string, purpose: "signup" | "login") =>
  layout(
    purpose === "signup" ? "Verify your email" : "Your login code",
    p("Use the code below to complete your verification:") +
      `<div style="margin:0 0 18px 0;text-align:center;"><span style="display:inline-block;padding:10px 24px;border-radius:999px;background:#020617;border:1px solid rgba(34,197,94,0.6);color:#4ade80;font-size:22px;font-weight:700;letter-spacing:6px;">${escapeHtml(code)}</span></div>` +
      p("This code expires in 5 minutes. If you did not request it, you can ignore this email.")
  );

export const resetEmail = (name: string, url: string) =>
  layout(
    "Reset Your Password",
    p(`Hi ${escapeHtml(name) || "there"},`) +
      p("We received a request to reset the password for your Eco Mining account.") +
      `<div style="margin:0 0 18px 0;text-align:center;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 22px;border-radius:999px;background:#22c55e;color:#050810;font-size:14px;font-weight:600;text-decoration:none;">Reset Password</a></div>` +
      p(`Or copy this link into your browser:<br><span style="word-break:break-all;color:#9ca3af;font-size:12px;">${escapeHtml(url)}</span>`) +
      p("This link expires in 10 minutes. If you did not request a reset, you can ignore this email.")
  );

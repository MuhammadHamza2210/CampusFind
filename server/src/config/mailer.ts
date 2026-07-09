import nodemailer from 'nodemailer';
import { env } from './env';

// SMTP transport — used for local dev / fallback only. NOTE: outbound SMTP is
// blocked on some hosts (e.g. Hugging Face Spaces), where it hangs ~2 min then
// fails. In production we send over HTTPS via Brevo (see sendViaBrevo below).
let transporter: nodemailer.Transporter | null = null;

if (env.smtp.enabled) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    // Fail fast instead of hanging ~2 min when the SMTP port is blocked.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function otpHtml(code: string): string {
  return `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#4F46E5;margin:0 0 8px">CampusFind</h2>
        <p style="color:#374151">Use the code below to verify your account:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;background:#F3F4F6;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${code}</div>
        <p style="color:#9CA3AF;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>`;
}

// Send via Brevo's HTTP API (port 443) so it works on hosts that block SMTP.
async function sendViaBrevo(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.brevo.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.brevo.fromEmail, name: env.brevo.fromName },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Brevo send failed (${res.status}): ${body}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = 'Your CampusFind verification code';
  const text = `Your CampusFind verification code is ${code}. It expires in 10 minutes.`;
  const html = otpHtml(code);

  // Preferred on hosts that block SMTP (Hugging Face): send over HTTPS via Brevo.
  if (env.brevo.enabled) {
    await sendViaBrevo(to, subject, text, html);
    return;
  }

  if (transporter) {
    await transporter.sendMail({ from: env.smtp.from, to, subject, text, html });
    return;
  }

  // Dev fallback — no email provider configured.
  console.log('\n──────────── CampusFind OTP ────────────');
  console.log(`  To:   ${to}`);
  console.log(`  Code: ${code}   (valid 10 min)`);
  console.log('────────────────────────────────────────\n');
}

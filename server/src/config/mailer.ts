import nodemailer from 'nodemailer';
import { env } from './env';

let transporter: nodemailer.Transporter | null = null;

if (env.smtp.enabled) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = 'Your CampusFind verification code';
  const text = `Your CampusFind verification code is ${code}. It expires in 10 minutes.`;

  if (!transporter) {
    // Dev fallback — no SMTP configured.
    console.log('\n──────────── CampusFind OTP ────────────');
    console.log(`  To:   ${to}`);
    console.log(`  Code: ${code}   (valid 10 min)`);
    console.log('────────────────────────────────────────\n');
    return;
  }

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#4F46E5;margin:0 0 8px">CampusFind</h2>
        <p style="color:#374151">Use the code below to verify your account:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;background:#F3F4F6;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${code}</div>
        <p style="color:#9CA3AF;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>`,
  });
}

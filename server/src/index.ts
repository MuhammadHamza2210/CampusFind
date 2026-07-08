import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import { env } from './config/env';

async function start() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  // Start listening immediately so the platform sees a healthy port and
  // /api/health responds right away — then connect to MongoDB in the background
  // (with retries). DB-backed routes buffer/err until the connection is ready.
  server.listen(env.port, () => {
    console.log(`\n🚀 CampusFind API running on http://localhost:${env.port}`);
    console.log(`   Allowed email domain: @${env.allowedEmailDomain}`);
    console.log(`   Images: ${env.cloudinary.enabled ? 'Cloudinary' : 'local /uploads'}`);
    console.log(`   Email:  ${env.smtp.enabled ? 'SMTP' : 'console (dev OTP)'}\n`);
  });

  connectDB().catch((err) => console.error('MongoDB connect loop error:', err));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

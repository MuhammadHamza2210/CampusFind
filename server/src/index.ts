import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import { env } from './config/env';

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`\n🚀 CampusFind API running on http://localhost:${env.port}`);
    console.log(`   Allowed email domain: @${env.allowedEmailDomain}`);
    console.log(`   Images: ${env.cloudinary.enabled ? 'Cloudinary' : 'local /uploads'}`);
    console.log(`   Email:  ${env.smtp.enabled ? 'SMTP' : 'console (dev OTP)'}\n`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

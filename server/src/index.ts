import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';
import { env } from './config/env';

// Safety nets: keep the server alive through transient errors (e.g. a flaky DB
// connection) instead of crashing — a crash would restart-loop the container.
process.on('unhandledRejection', (reason) =>
  console.error('Unhandled promise rejection:', reason)
);
process.on('uncaughtException', (err) =>
  console.error('Uncaught exception:', err)
);

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
    console.log(
      `   Email:  ${
        env.brevo.enabled
          ? 'Brevo (HTTP API)'
          : env.smtp.enabled
            ? 'SMTP'
            : 'console (dev OTP)'
      }\n`
    );
  });

  connectDB().catch((err) => console.error('MongoDB connect loop error:', err));
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

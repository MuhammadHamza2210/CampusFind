import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';

/**
 * DNS override — OPT-IN via `DNS_SERVERS`.
 *
 * On some networks (university Wi-Fi, certain routers/ISPs) the OS resolver
 * refuses the SRV query that Atlas `mongodb+srv://` URIs need. Setting
 * `DNS_SERVERS=1.1.1.1,8.8.8.8` pins reliable resolvers for THIS process.
 *
 * We do NOT pin automatically: on hosts like Hugging Face/containers the
 * platform's own resolver works, and forcing public resolvers (that the
 * sandbox may block) makes the SRV lookup hang. So only override when asked.
 */
function pinDnsResolvers(servers: string[]) {
  try {
    const existing = dns.getServers();
    dns.setServers([...servers, ...existing.filter((s) => !servers.includes(s))]);
  } catch {
    /* ignore — non-fatal */
  }
}

/** Reject if `promise` doesn't settle within `ms` — bounds a hung connect. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function attemptConnect(): Promise<void> {
  const connectPromise = mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    family: 4, // prefer IPv4 — avoids IPv6 stalls in some container networks
  });
  // Swallow a late rejection so a timed-out attempt doesn't crash the process.
  connectPromise.catch(() => {});
  await withTimeout(connectPromise, 15000, 'MongoDB connect');
}

/**
 * Connect with unbounded background retries. The caller does NOT await this —
 * the HTTP server starts listening first (so the platform sees a healthy port
 * and /api/health responds), and the DB connects shortly after. This survives
 * the intermittent SRV/DNS stalls seen on some container hosts.
 */
export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  const customDns = (process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (customDns.length) pinDnsResolvers(customDns);

  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      console.log(`→ Connecting to MongoDB (attempt ${attempt})…`);
      await attemptConnect();
      console.log(`✓ MongoDB connected (${mongoose.connection.host})`);

      // Build indexes (incl. the listing text index) so index-backed queries
      // like `$text` search can't 500 during the autoIndex race. Best-effort.
      try {
        await Promise.all(
          Object.values(mongoose.models).map((m) => m.createIndexes())
        );
      } catch (indexErr) {
        console.warn('⚠ Index build warning:', (indexErr as Error).message);
      }
      return;
    } catch (err) {
      console.error(
        `✗ MongoDB connect attempt ${attempt} failed: ${(err as Error).message} — retrying in 4s`
      );
      try {
        await mongoose.disconnect();
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

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

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  const customDns = (process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (customDns.length) pinDnsResolvers(customDns);

  try {
    console.log('→ Connecting to MongoDB…');
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      family: 4, // prefer IPv4 — avoids IPv6 stalls in some container networks
    });
    const host = mongoose.connection.host;
    console.log(`✓ MongoDB connected (${host})`);

    // Build all model indexes (incl. the listing text index) before serving, so
    // index-backed queries like `$text` search can't 500 during the autoIndex
    // race on a fresh database. Best-effort — a slow build shouldn't block boot.
    try {
      await Promise.all(
        Object.values(mongoose.models).map((m) => m.createIndexes())
      );
    } catch (indexErr) {
      console.warn('⚠ Index build warning:', (indexErr as Error).message);
    }
  } catch (err) {
    const msg = (err as Error).message;
    console.error('✗ MongoDB connection failed:', msg);
    if (/querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT|ETIMEDOUT/.test(msg)) {
      console.error(
        '  This looks like a DNS or network block. Fixes:\n' +
          '    1. Atlas → Network Access → allow your IP (or 0.0.0.0/0 for dev).\n' +
          '    2. Try a different network / phone hotspot (campus Wi-Fi often blocks it).\n' +
          '    3. Set DNS_SERVERS=1.1.1.1,8.8.8.8 in .env, or use the non-SRV\n' +
          '       (mongodb://host1,host2,host3/...) connection string from Atlas.'
      );
    } else {
      console.error('  Tip: check MONGODB_URI credentials and DB name in .env.');
    }
    process.exit(1);
  }
}

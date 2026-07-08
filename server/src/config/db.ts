import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';

/**
 * Atlas `mongodb+srv://` URIs need a DNS SRV lookup. On some networks
 * (university Wi-Fi, certain routers/ISPs) the OS resolver refuses the SRV
 * query that Node's c-ares makes — you get `querySrv ECONNREFUSED` even though
 * `nslookup` works. Pinning reliable public resolvers for THIS process fixes it
 * without touching system DNS. Override with DNS_SERVERS=1.1.1.1,8.8.8.8 if needed.
 */
function pinDnsResolvers() {
  const custom = (process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const publicDns = custom.length ? custom : ['1.1.1.1', '8.8.8.8'];
  try {
    const existing = dns.getServers();
    // Try public resolvers first, then fall back to whatever the OS had.
    dns.setServers([...publicDns, ...existing.filter((s) => !publicDns.includes(s))]);
  } catch {
    /* ignore — non-fatal */
  }
}

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  if (env.mongoUri.startsWith('mongodb+srv://')) pinDnsResolvers();

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 15000,
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

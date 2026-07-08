/**
 * End-to-end smoke test against an in-memory MongoDB.
 * Boots the compiled app (dist/) and drives the real HTTP API:
 *   signup -> read OTP from DB -> verify -> create listing -> browse
 *   -> comment -> second user -> start conversation -> send message.
 *
 * Run:  node scripts/smoke.mjs   (after `npm run build`)
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const log = (ok, msg) => console.log(`${ok ? '✓' : '✗'} ${msg}`);
let failures = 0;
function check(cond, msg) {
  if (!cond) failures++;
  log(cond, msg);
}

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = mongod.getUri();
process.env.JWT_SECRET = 'smoke-secret';
process.env.ALLOWED_EMAIL_DOMAIN = 'bahria.edu.pk';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

const { createApp } = await import('../dist/app.js');
const { connectDB } = await import('../dist/config/db.js');
const { User } = await import('../dist/models/User.js');

await connectDB();
const app = createApp();
const server = app.listen(5099);
const base = 'http://localhost:5099';

// Minimal per-user cookie jar.
function makeClient() {
  let cookie = '';
  return async (method, path, body, isForm = false) => {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body && isForm) {
      payload = body; // FormData
    } else if (body) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + path, { method, headers, body: payload });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, json };
  };
}

try {
  // Health
  const health = await fetch(base + '/api/health').then((r) => r.json());
  check(health.ok === true, 'GET /api/health returns ok');

  const alice = makeClient();
  const bob = makeClient();

  // Domain restriction
  const bad = await alice('POST', '/api/auth/signup', {
    name: 'Wrong', email: 'x@gmail.com', password: 'secret1',
  });
  check(bad.status === 400, 'signup rejects non-university email');

  // Signup Alice
  const s1 = await alice('POST', '/api/auth/signup', {
    name: 'Alice Khan', email: 'alice@bahria.edu.pk', password: 'secret1',
  });
  check(s1.status === 201 && s1.json.needsVerification, 'Alice signup needs verification');

  // Pull OTP straight from DB (as the console/email would deliver it)
  const aliceDoc = await User.findOne({ email: 'alice@bahria.edu.pk' }).select('+otpCode');
  const v1 = await alice('POST', '/api/auth/verify', {
    email: 'alice@bahria.edu.pk', code: aliceDoc.otpCode,
  });
  check(v1.status === 200 && v1.json.user?.email === 'alice@bahria.edu.pk', 'Alice verifies OTP & logs in');

  // /me reflects session cookie
  const me = await alice('GET', '/api/auth/me');
  check(me.json.user?.name === 'Alice Khan', 'GET /api/auth/me returns session user');

  // Create a listing (multipart, no image)
  const fd = new FormData();
  fd.set('type', 'sell');
  fd.set('title', 'Casio FX-991EX calculator');
  fd.set('description', 'Barely used, comes with cover. Great for exams.');
  fd.set('category', 'calculators');
  fd.set('location', 'library');
  fd.set('price', '2500');
  const c1 = await alice('POST', '/api/listings', fd, true);
  check(c1.status === 201 && c1.json.listing?.id, 'Alice creates a sell listing');
  const listingId = c1.json.listing.id;
  check(c1.json.listing.price === 2500, 'listing stored price = 2500');

  // Missing price on sell is rejected
  const fdBad = new FormData();
  fdBad.set('type', 'sell');
  fdBad.set('title', 'No price item');
  fdBad.set('description', 'This should fail validation.');
  fdBad.set('category', 'books');
  fdBad.set('location', 'cafeteria');
  const cBad = await alice('POST', '/api/listings', fdBad, true);
  check(cBad.status === 400, 'sell listing without price is rejected');

  // Browse + search
  const browse = await alice('GET', '/api/listings?q=calculator&type=sell');
  check(browse.json.total >= 1 && browse.json.items[0].title.includes('Casio'), 'search finds the listing');

  // Signup + verify Bob
  await bob('POST', '/api/auth/signup', {
    name: 'Bob Ali', email: 'bob@bahria.edu.pk', password: 'secret2',
  });
  const bobDoc = await User.findOne({ email: 'bob@bahria.edu.pk' }).select('+otpCode');
  await bob('POST', '/api/auth/verify', { email: 'bob@bahria.edu.pk', code: bobDoc.otpCode });

  // Bob comments
  const cm = await bob('POST', `/api/listings/${listingId}/comments`, { body: 'Is this still available?' });
  check(cm.status === 201 && cm.json.comment?.author?.name === 'Bob Ali', 'Bob adds a comment');

  // Bob starts a conversation about Alice's listing
  const convo = await bob('POST', '/api/conversations', { listingId });
  check(convo.status === 201 && convo.json.conversation?._id, 'Bob starts a conversation');
  const convoId = convo.json.conversation._id;

  // Alice can't message about her own listing
  const selfChat = await alice('POST', '/api/conversations', { listingId });
  check(selfChat.status === 400, 'owner cannot message their own listing');

  // Bob sends a message
  const msg = await bob('POST', `/api/conversations/${convoId}/messages`, { body: 'Hi Alice!' });
  check(msg.status === 201 && msg.json.message?.body === 'Hi Alice!', 'Bob sends a message');

  // Alice sees the conversation + message
  const aliceConvos = await alice('GET', '/api/conversations');
  check(aliceConvos.json.items.length === 1, 'Alice sees one conversation');
  const aliceMsgs = await alice('GET', `/api/conversations/${convoId}/messages`);
  check(aliceMsgs.json.items.some((m) => m.body === 'Hi Alice!'), 'Alice reads Bob\'s message');

  // Mark as sold
  const sold = await alice('PATCH', `/api/listings/${listingId}/status`, { status: 'sold' });
  check(sold.json.listing?.status === 'sold', 'Alice marks the listing as sold');

  // Bob cannot edit Alice's listing
  const fdEdit = new FormData();
  fdEdit.set('title', 'Hacked title');
  const hijack = await bob('PATCH', `/api/listings/${listingId}`, fdEdit, true);
  check(hijack.status === 403, 'non-owner cannot edit a listing');

  // ---- Lost ↔ Found matching + alerts ----
  // Alice reports a lost item first — no complement exists yet, so no alert.
  const lostFd = new FormData();
  lostFd.set('type', 'lost');
  lostFd.set('title', 'Lost blue Casio scientific calculator');
  lostFd.set('description', 'Left my Casio calculator near the library reading hall.');
  lostFd.set('category', 'calculators');
  lostFd.set('location', 'library');
  const lost = await alice('POST', '/api/listings', lostFd, true);
  check(lost.status === 201 && lost.json.listing?.id, 'Alice reports a lost calculator');
  const lostId = lost.json.listing.id;

  // Bob posts a matching found item → should alert Alice.
  const foundFd = new FormData();
  foundFd.set('type', 'found');
  foundFd.set('title', 'Found a Casio calculator');
  foundFd.set('description', 'Picked up a Casio calculator in the library. Come claim it.');
  foundFd.set('category', 'calculators');
  foundFd.set('location', 'library');
  const found = await bob('POST', '/api/listings', foundFd, true);
  check(found.status === 201 && found.json.listing?.id, 'Bob reports a found calculator');
  const foundId = found.json.listing.id;

  // Bob's found listing surfaces Alice's lost listing as a candidate.
  const foundMatches = await bob('GET', `/api/listings/${foundId}/matches`);
  check(
    foundMatches.json.items?.some((m) => m.id === lostId),
    'found listing surfaces the complementary lost listing'
  );

  // Alice received a match alert linking Bob's found item to her lost one.
  const notifs = await alice('GET', '/api/notifications');
  const matchNotif = notifs.json.items?.find(
    (n) => n.type === 'match' && n.matchedListing?.id === lostId
  );
  check(notifs.json.unread >= 1, 'Alice has an unread match alert');
  check(
    !!matchNotif && matchNotif.listing?.id === foundId,
    "Alice is alerted that Bob's found item matches her lost one"
  );

  // Sell listings never produce match noise.
  const sellMatches = await alice('GET', `/api/listings/${listingId}/matches`);
  check(sellMatches.json.items?.length === 0, 'sell listings have no matches');

  // Dashboard aggregate: Alice's open lost listing shows Bob's found item.
  const myMatches = await alice('GET', '/api/listings/mine/matches');
  const lostGroup = myMatches.json.groups?.find((g) => g.listing.id === lostId);
  check(
    !!lostGroup && lostGroup.matches.some((m) => m.id === foundId),
    'dashboard groups matches under my open lost listing'
  );

  // Marking all read clears the badge.
  await alice('POST', '/api/notifications/read-all');
  const unread = await alice('GET', '/api/notifications/unread-count');
  check(unread.json.count === 0, 'read-all clears the unread badge');

  // ---- Ownership claim on a found item ----
  // Bob posts a found wallet with a verification question.
  const wfd = new FormData();
  wfd.set('type', 'found');
  wfd.set('title', 'Found a brown leather wallet');
  wfd.set('description', 'Found near the cafeteria. Contains a few cards.');
  wfd.set('category', 'accessories');
  wfd.set('location', 'cafeteria');
  wfd.set('verificationQuestion', 'What colour is the wallet and what is inside?');
  const wallet = await bob('POST', '/api/listings', wfd, true);
  check(
    wallet.status === 201 &&
      wallet.json.listing?.verificationQuestion?.includes('colour'),
    'found listing stores a verification question'
  );
  const walletId = wallet.json.listing.id;

  // Alice claims it with a proof answer.
  const claim = await alice('POST', `/api/listings/${walletId}/claims`, {
    answer: 'Brown leather, has my student ID and a metro card inside.',
  });
  check(
    claim.status === 201 && claim.json.claim?.status === 'pending',
    'Alice submits an ownership claim'
  );
  const claimId = claim.json.claim.id;

  // Duplicate claim is blocked.
  const dupe = await alice('POST', `/api/listings/${walletId}/claims`, {
    answer: 'again',
  });
  check(dupe.status === 409, 'duplicate claim is rejected');

  // Only the finder may decide.
  const badDecide = await alice('PATCH', `/api/claims/${claimId}`, {
    status: 'approved',
  });
  check(badDecide.status === 403, 'only the finder can decide a claim');

  // Bob sees the claim + answer on his listing.
  const bobClaims = await bob('GET', `/api/listings/${walletId}/claims`);
  check(
    bobClaims.json.items?.some(
      (c) => c.id === claimId && c.answer.includes('metro')
    ),
    'finder sees the claim and its answer'
  );

  // Bob approves → item resolved, chat opened, Alice notified.
  const approve = await bob('PATCH', `/api/claims/${claimId}`, {
    status: 'approved',
  });
  check(
    approve.status === 200 && approve.json.claim?.status === 'approved',
    'finder approves the claim'
  );
  check(!!approve.json.claim?.conversation, 'approval opens a conversation');

  const walletAfter = await bob('GET', `/api/listings/${walletId}`);
  check(
    walletAfter.json.listing?.status === 'resolved',
    'approved item is marked resolved'
  );

  const aliceNotifs2 = await alice('GET', '/api/notifications');
  check(
    aliceNotifs2.json.items?.some((n) => n.type === 'claim-approved'),
    'claimant is notified their claim was approved'
  );
  const aliceClaims = await alice('GET', '/api/claims/mine');
  check(
    aliceClaims.json.items?.some(
      (c) => c.id === claimId && c.status === 'approved' && c.conversation
    ),
    'claimant sees approved claim with a conversation'
  );

  console.log('');
  if (failures === 0) {
    console.log('🎉 All smoke checks passed.');
  } else {
    console.log(`❌ ${failures} check(s) failed.`);
  }
} catch (err) {
  failures++;
  console.error('Smoke test crashed:', err);
} finally {
  server.close();
  await mongod.stop();
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

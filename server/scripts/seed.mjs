/**
 * Seeds the database configured in .env with demo users, listings and a chat,
 * so the site never looks empty. Safe to re-run — it wipes only the demo
 * accounts (and their data) before recreating them.
 *
 * Run:  npm run seed
 *
 * Demo logins (all verified, password: password123):
 *   usman@bahria.edu.pk · ashar@bahria.edu.pk · ayesha@bahria.edu.pk
 */
import '../dist/config/env.js';
import mongoose from 'mongoose';
import { connectDB } from '../dist/config/db.js';
import { User, hashPassword } from '../dist/models/User.js';
import { Listing } from '../dist/models/Listing.js';
import { Comment } from '../dist/models/Comment.js';
import { Conversation, Message } from '../dist/models/Message.js';

const PASSWORD = 'password123';

// Images. Five are the user's own photos served from client/public/seed;
// the remaining three use verified Unsplash photos.
const IMG = {
  calculator: '/seed/casio.jpg',
  textbook: '/seed/dsa.jpg',
  wallet: '/seed/wallet.webp',
  keys: '/seed/keychain.jpg',
  coat: '/seed/coat.jpg',
  mouse:
    'https://plus.unsplash.com/premium_photo-1671611822374-4719df5c89bb?w=640&h=480&fit=crop&crop=entropy&q=80&fm=jpg',
  bottle:
    'https://plus.unsplash.com/premium_photo-1664527305901-db3d4e724d15?w=640&h=480&fit=crop&crop=entropy&q=80&fm=jpg',
  charger:
    'https://plus.unsplash.com/premium_photo-1669262667978-5d4aafe29dd5?w=640&h=480&fit=crop&crop=entropy&q=80&fm=jpg',
};

const DEMO_USERS = [
  { name: 'Muhammad Usman', email: 'usman@bahria.edu.pk' },
  { name: 'Ashar Ali', email: 'ashar@bahria.edu.pk' },
  { name: 'Ayesha Siddiqui', email: 'ayesha@bahria.edu.pk' },
];

const USMAN = 'usman@bahria.edu.pk';
const ASHAR = 'ashar@bahria.edu.pk';
const AYESHA = 'ayesha@bahria.edu.pk';

const LISTINGS = [
  {
    by: USMAN,
    type: 'sell',
    title: 'Casio FX-991EX Scientific Calculator',
    description:
      'Barely used, comes with the original slide cover. Perfect for engineering and math exams. Selling because I upgraded to a graphing model.',
    category: 'calculators',
    location: 'library',
    price: 2500,
    image: IMG.calculator,
  },
  {
    by: USMAN,
    type: 'sell',
    title: 'Introduction to Algorithms (CLRS) — 4th Ed.',
    description:
      'The classic Cormen textbook, 4th edition. A few highlights inside but otherwise in great shape. Great for the DSA course.',
    category: 'books',
    location: 'block-b',
    price: 1800,
    image: IMG.textbook,
  },
  {
    by: ASHAR,
    type: 'lost',
    title: 'Black leather wallet',
    description:
      'Lost somewhere between the cafeteria and Block A around 2pm. Has my student ID and a bank card. Reward if returned!',
    category: 'accessories',
    location: 'cafeteria',
    image: IMG.wallet,
  },
  {
    by: AYESHA,
    type: 'found',
    title: 'Found: Set of keys with a red keychain',
    description:
      'Found near the sports complex entrance this morning. Three keys on a red lanyard. DM me to claim with a description.',
    category: 'keys',
    location: 'sports-complex',
    image: IMG.keys,
  },
  {
    by: ASHAR,
    type: 'sell',
    title: 'Logitech M185 Wireless Mouse',
    description:
      'Works perfectly, includes the USB receiver. Selling since I switched to a trackpad. Batteries included.',
    category: 'electronics',
    location: 'block-c',
    price: 900,
    image: IMG.mouse,
  },
  {
    by: AYESHA,
    type: 'sell',
    title: 'Scientific Lab Coat (Size M)',
    description:
      'White lab coat, size medium, worn twice. Clean and stain-free. Ideal for chemistry and biology labs.',
    category: 'clothing',
    location: 'block-a',
    price: 1200,
    image: IMG.coat,
  },
  {
    by: USMAN,
    type: 'found',
    title: 'Found: Orange water bottle in the library',
    description:
      'Someone left an orange insulated bottle with a bamboo cap on the 2nd floor reading area. Left it with the front desk — post here so I know it reached you.',
    category: 'other',
    location: 'library',
    image: IMG.bottle,
  },
  {
    by: ASHAR,
    type: 'lost',
    title: 'Lost: USB-C charger + cable',
    description:
      'Left my 65W charger plugged in at the auditorium during the seminar. White brick, braided cable. Please reach out!',
    category: 'electronics',
    location: 'auditorium',
    image: IMG.charger,
  },
];

async function run() {
  await connectDB();

  const emails = DEMO_USERS.map((u) => u.email);
  console.log('› Clearing previous demo data…');
  const existing = await User.find({ email: { $in: emails } });
  const existingIds = existing.map((u) => u._id);
  if (existingIds.length) {
    const listings = await Listing.find({ owner: { $in: existingIds } });
    const listingIds = listings.map((l) => l._id);
    const convos = await Conversation.find({ participants: { $in: existingIds } });
    const convoIds = convos.map((c) => c._id);
    await Promise.all([
      Comment.deleteMany({ listing: { $in: listingIds } }),
      Listing.deleteMany({ owner: { $in: existingIds } }),
      Message.deleteMany({ conversation: { $in: convoIds } }),
      Conversation.deleteMany({ _id: { $in: convoIds } }),
      User.deleteMany({ _id: { $in: existingIds } }),
    ]);
  }

  console.log('› Creating users…');
  const passwordHash = await hashPassword(PASSWORD);
  const users = {};
  for (const u of DEMO_USERS) {
    const doc = await User.create({ ...u, passwordHash, isVerified: true });
    users[u.email] = doc;
  }

  console.log('› Creating listings…');
  const created = [];
  for (const l of LISTINGS) {
    const doc = await Listing.create({
      type: l.type,
      title: l.title,
      description: l.description,
      category: l.category,
      location: l.location,
      price: l.type === 'sell' ? l.price : undefined,
      imageUrl: l.image,
      owner: users[l.by]._id,
    });
    created.push(doc);
  }

  console.log('› Adding a comment and a demo conversation…');
  const calc = created[0]; // Usman's calculator
  await Comment.create({
    listing: calc._id,
    author: users[ASHAR]._id,
    body: 'Is this still available? Could we meet at the library tomorrow?',
  });

  const convo = await Conversation.create({
    listing: calc._id,
    participants: [users[ASHAR]._id, users[USMAN]._id],
  });
  const seedMessages = [
    { from: ASHAR, body: 'Hi! Is the Casio calculator still up for grabs?' },
    { from: USMAN, body: 'Yes it is! Are you around campus tomorrow?' },
    { from: ASHAR, body: 'Perfect — I can meet at the library at 1pm.' },
  ];
  let last;
  for (const m of seedMessages) {
    last = await Message.create({
      conversation: convo._id,
      sender: users[m.from]._id,
      body: m.body,
      readBy: [users[m.from]._id],
    });
  }
  convo.lastMessage = last.body;
  convo.lastMessageAt = last.createdAt;
  await convo.save();

  console.log('\n✅ Seed complete!');
  console.log(`   ${DEMO_USERS.length} users · ${created.length} listings · 1 conversation`);
  console.log('\n   Log in with any of these (password: password123):');
  emails.forEach((e) => console.log(`     • ${e}`));
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

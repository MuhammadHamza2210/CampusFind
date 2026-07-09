<div align="center">

# 🎓 CampusFind

### Your campus marketplace & lost‑and‑found — all in one place.

Post and recover **lost & found** items, and **buy / sell** used goods — safely, within your own verified university community. Real‑time chat included.

### 🌐 **Live app → [campus-find-mu.vercel.app](https://campus-find-mu.vercel.app/)**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101?logo=socket.io&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

---

## ✨ What is CampusFind?

CampusFind is a web app that solves two everyday campus problems:

- 🔎 **Lost & Found** — Lost your calculator, ID card, or keys? Post it. Found something? Post it too — and the app even helps match lost items with found ones.
- 🛒 **Buy & Sell** — Sell your old books, electronics, or stationery to fellow students at a fair price.

Everyone on the platform is a **verified student** (sign‑up is gated to your university email), so you always know who you're dealing with.

---

## 🧭 How It Works

```
1. Sign up  ──►  2. Verify email  ──►  3. Browse or Post  ──►  4. Chat & meet up
   (uni email)     (6‑digit code)        (lost/found/sell)      (real‑time)
```

1. **Sign up** with your university email address.
2. **Verify** — a 6‑digit code is emailed to you; enter it to activate your account.
3. **Browse** the feed or **post** your own item (lost, found, or for sale) with a photo, category, and campus location.
4. **Connect** — chat in real time with the other student, agree where to meet, and you're done! 🎉

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 🔐 **University‑email sign‑up** | Only students with a valid university email can join. A one‑time code (OTP) is emailed to verify each account. |
| 📦 **Post listings** | Create **Lost**, **Found**, or **For‑Sale** posts with drag‑&‑drop photos, a category, a campus location, and (for sales) a price. |
| 🔁 **Lost ↔ Found matching** | A new post is automatically scored against complementary listings (category + location + keywords). Strong matches surface on the listing and fire a live alert to the other person. |
| 🙋 **Claim & handoff** | Finders can set a verification question; a claimant answers it to prove ownership. On approval, the item is marked resolved and a private chat opens to arrange pickup. |
| 💬 **Real‑time chat** | Message a seller or finder instantly — messages arrive live via WebSockets, no refresh needed. |
| 🔔 **Live notifications** | Get notified the moment someone messages you, comments, matches, or claims your item. |
| 💭 **Comments** | Ask questions publicly on any listing. |
| 🔎 **Browse & search** | Live search with filters by type, category, location, and date — plus grid/list views and sorting. |
| 👤 **Your dashboard** | Manage your own listings — edit, mark as resolved/sold, or delete. |
| 🛡️ **Admin moderation** | Admins can review and remove spam or inappropriate listings. |
| ☁️ **Cloud image hosting** | Photos are stored and optimized on Cloudinary. |

---

## 🛠️ Tech Stack

**Frontend** — deployed on **Vercel**
- React 18 + TypeScript + Vite
- Tailwind CSS (styling) · React Router (navigation)
- Axios (API calls) · Socket.io‑client (real‑time) · react‑hot‑toast (notifications)

**Backend** — deployed on a **Hugging Face Docker Space**
- Node.js + Express + TypeScript
- MongoDB (Mongoose) on **MongoDB Atlas**
- Socket.io (real‑time messaging & notifications)
- JWT + bcrypt (token auth) · Zod (validation) · Helmet + rate‑limiting (security)
- Multer + **Cloudinary** (image uploads) · **Brevo** (transactional email / OTP)

---

## 💻 Run It Locally

### Prerequisites
- **Node.js 18+** and npm
- Optionally MongoDB — if you skip it, the server falls back to a local Mongo instance.

### 1. Clone the repo
```bash
git clone https://github.com/MuhammadHamza2210/CampusFind.git
cd CampusFind
```

### 2. Start the backend
```bash
cd server
npm install
cp .env.example .env      # fill in values (see the table below)
npm run dev               # runs on http://localhost:5000
```

### 3. Start the frontend (in a new terminal)
```bash
cd client
npm install
cp .env.example .env      # leave VITE_API_URL blank for local dev
npm run dev               # runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser. 🎉

> ⚡ **Zero‑config dev mode** — the server runs even with nothing configured:
> - No `MONGODB_URI` → connects to a local Mongo (`mongodb://127.0.0.1:27017/campusfind`).
> - No Cloudinary keys → images are saved to `server/uploads/` and served locally.
> - No email service → **OTP codes are printed in the backend terminal**, so you can test sign‑up offline.

---

## 🔧 Environment Variables (backend `server/.env`)

| Variable | Required | What it's for |
|---|---|---|
| `PORT` | no | Port the server listens on (default `5000`). |
| `CLIENT_URL` | ✅ | Your frontend URL, for CORS (e.g. `http://localhost:5173`). |
| `JWT_SECRET` | ✅ | A long random string used to sign login tokens. |
| `MONGODB_URI` | no* | MongoDB connection string (*falls back to local Mongo). |
| `ALLOWED_EMAIL_DOMAIN` | no | Allowed sign‑up domain(s), comma‑separated (e.g. `student.bahria.edu.pk,gmail.com`). |
| `ADMIN_EMAILS` | no | Comma‑separated emails that get admin rights. |
| `BREVO_API_KEY` | no | [Brevo](https://www.brevo.com) API key for sending OTP emails over HTTPS. |
| `BREVO_FROM_EMAIL` | no | A Brevo‑verified sender address for the OTP emails. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | no | Cloud image hosting (falls back to local `/uploads`). |

**Frontend `client/.env`:** `VITE_API_URL` — the backend base URL. Leave blank for local dev (uses the Vite proxy).

> 📧 **Email note:** In production CampusFind sends OTP emails through **Brevo's HTTP API**, not SMTP — because many hosts (including Hugging Face) block outbound SMTP ports, which makes SMTP hang. If `BREVO_API_KEY` is unset it falls back to SMTP, and if that's unset too, codes are logged to the console.

---

## 📁 Project Structure

```
CampusFind/
├── client/            # React + Vite frontend
│   └── src/
│       ├── pages/     # Home, Signup, Login, Listing, Messages, Dashboard, Admin…
│       ├── components/
│       ├── store/     # Auth & notification state
│       └── lib/       # API client & socket setup
└── server/            # Express + TypeScript backend
    └── src/
        ├── routes/        # auth, listings, messages, claims, comments, admin…
        ├── controllers/   # request handlers
        ├── models/        # Mongoose schemas (User, Listing, Message…)
        ├── middleware/    # auth, validation, rate‑limiting, errors
        ├── socket/        # real‑time messaging & notifications
        └── config/        # db, mailer, cloudinary, env
```

---

## 🧪 Testing

The backend ships with an end‑to‑end smoke test that boots the real API against an in‑memory MongoDB and drives the full flow (signup → OTP → create listing → browse → comment → chat → mark sold, plus authorization guards):

```bash
cd server
npm run test:smoke        # no external database needed
```

---

## 📜 Available Scripts

| | `npm run dev` | `npm run build` | other |
|---|---|---|---|
| **client** | Vite dev server | production build | `npm run preview` |
| **server** | hot‑reload dev (tsx) | compile to `dist/` | `npm start`, `npm run test:smoke` |

---

## 👤 Author

**Muhammad Hamza** — [@MuhammadHamza2210](https://github.com/MuhammadHamza2210)

## 📄 License

MIT — built for the CampusFind community.

---

<div align="center">

Made with ❤️ for students. If you find this useful, give it a ⭐!

</div>

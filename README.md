# CampusFind

A polished platform for university students to post & find **lost items**, **found items**, and **buy / sell / exchange** used goods within their own campus community.

Built as a real product — Linear/Notion/Airbnb-level attention to whitespace, typography, and micro-interactions.

> Stack: **React + TypeScript + Vite + Tailwind** (client) · **Node + Express + TypeScript + MongoDB** (server) · **Cloudinary** images · **Socket.io** chat · JWT auth restricted to a university email domain.

---

## Monorepo layout

```
campusfind/
├── client/          # React + Vite + Tailwind frontend
└── server/          # Express + TypeScript + MongoDB backend
```

Each package runs independently with `npm install && npm run dev`.

---

## Quick start (local)

### 1. Backend

```bash
cd server
cp .env.example .env      # then fill in values (see below)
npm install
npm run dev               # http://localhost:5000
```

### 2. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Open **http://localhost:5173**.

> **Zero-config dev mode:** If you don't set up MongoDB Atlas, Cloudinary, or SMTP, the server still runs:
> - No `MONGODB_URI` → connects to `mongodb://127.0.0.1:27017/campusfind` (local Mongo).
> - No Cloudinary keys → images are saved to `server/uploads/` and served locally.
> - No SMTP → OTP codes are **printed to the server console** so you can verify accounts offline.

---

## Environment variables

### `server/.env`

| Variable                | Required | Description                                                        |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `PORT`                  | no       | Server port (default `5000`).                                      |
| `CLIENT_URL`            | no       | Frontend origin for CORS (default `http://localhost:5173`).        |
| `MONGODB_URI`           | no*      | MongoDB Atlas connection string (falls back to local Mongo).       |
| `JWT_SECRET`            | **yes**  | Secret for signing JWTs.                                           |
| `ALLOWED_EMAIL_DOMAIN`  | no       | Restrict signup to this domain (default `bahria.edu.pk`).          |
| `COOKIE_SECURE`         | no       | `true` in production (HTTPS). Default `false` for local.           |
| `CLOUDINARY_CLOUD_NAME` | no       | Cloudinary cloud name (else local disk storage).                   |
| `CLOUDINARY_API_KEY`    | no       | Cloudinary API key.                                                |
| `CLOUDINARY_API_SECRET` | no       | Cloudinary API secret.                                             |
| `SMTP_HOST`/`SMTP_PORT` | no       | SMTP server (else OTP is logged to console).                       |
| `SMTP_USER`/`SMTP_PASS` | no       | SMTP credentials.                                                  |
| `MAIL_FROM`             | no       | From address for OTP emails.                                       |
| `ADMIN_EMAILS`          | no       | Comma-separated emails granted admin rights on signup.             |

### `client/.env`

| Variable        | Description                                        |
| --------------- | -------------------------------------------------- |
| `VITE_API_URL`  | Backend base URL (default `http://localhost:5000`).|

---

## Feature tour

- **Auth** — signup/login gated to your university email domain, OTP email verification, JWT in an httpOnly cookie.
- **Listings** — lost / found / sell, image upload (drag & drop), campus location, category, price. Edit, delete, mark resolved/sold.
- **Browse & search** — grid/list toggle, debounced live search, filters (type, category, location, date), sorting.
- **Detail page** — full image, poster info with verified badge, contact-reveal opt-in, comment thread.
- **Lost ↔ Found matching** — a new lost/found post is scored against complementary listings (category + campus location + keyword overlap); strong matches surface on the detail page and fire a realtime alert to the other party.
- **Claim & handoff** — finders can set a verification question; a claimant answers it to prove ownership, the finder approves/rejects from the listing, and an approval marks the item resolved and opens a private chat to arrange pickup (with realtime notifications throughout).
- **Messaging** — realtime 1:1 chat (Socket.io) between poster and interested user.
- **Dashboard** — my listings (active/resolved), my interests, profile.
- **Admin** — remove flagged/spam listings.

---

## Scripts

### server
- `npm run dev` — hot-reload dev server (tsx watch).
- `npm run build` — compile TypeScript to `dist/`.
- `npm start` — run compiled build.

### client
- `npm run dev` — Vite dev server.
- `npm run build` — production build to `dist/`.
- `npm run preview` — preview the production build.

---

## Testing

The backend ships with an end-to-end smoke test that boots the real API against an
in-memory MongoDB and drives the full flow (signup → OTP → create listing → browse →
comment → chat → mark sold, plus authorization guards):

```bash
cd server
npm run test:smoke
```

No external database required — it downloads a throwaway Mongo binary on first run.

---

## Deployment

- **Frontend → Vercel:** set `VITE_API_URL` to your Render backend URL. Root dir `client/`.
- **Backend → Render:** Web Service, root `server/`, build `npm install && npm run build`, start `npm start`. Set all secrets, `COOKIE_SECURE=true`, and `CLIENT_URL` to your Vercel domain.
- Use MongoDB Atlas + Cloudinary free tiers in production.

---

## License

MIT — built for the CampusFind community.

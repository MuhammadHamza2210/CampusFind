# Deploying CampusFind

The app is two deployables — the **backend** (`server/`) on Render and the
**frontend** (`client/`) on Vercel — plus MongoDB Atlas, Cloudinary, and SMTP.

Config included in this repo:

- `render.yaml` — Render Blueprint for the backend (pre-declares all env vars).
- `client/vercel.json` — SPA rewrite so deep links (`/dashboard`, `/listings/:id`)
  don't 404 on refresh.
- `.node-version` (22) in both packages for reproducible builds.

---

## 1. Backend → Render

1. **New → Blueprint** → select this repo → Render reads `render.yaml`.
2. Fill the `sync: false` env vars in the dashboard (paste from your local
   `server/.env`):
   - `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
     `CLOUDINARY_API_SECRET`
   - `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` (see below)
   - `CLIENT_URL` — set **after** you have the Vercel URL (step 2), then redeploy.
3. `JWT_SECRET` is auto-generated; `COOKIE_SECURE=true` is preset (required for
   cross-domain login).

> Free tier note: the service sleeps after ~15 min idle and takes ~50s to wake.

## 2. Frontend → Vercel

1. **New Project** → import this repo → **Root Directory: `client`**
   (Vercel auto-detects Vite).
2. Env var: `VITE_API_URL = https://<your-render-service>.onrender.com`
3. Deploy, then set Render's `CLIENT_URL` to the resulting
   `https://<app>.vercel.app` and redeploy the backend.

## 3. Email / OTP (required for real users)

Signup uses an OTP emailed to the user; without SMTP the code only prints to the
server console. Easiest is a **Gmail App Password** (enable 2FA → generate an app
password):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<16-char app password>
MAIL_FROM=CampusFind <you@gmail.com>
```

---

## Post-deploy smoke check

1. Open the Vercel URL, sign up with an `@<ALLOWED_EMAIL_DOMAIN>` email.
2. Confirm the OTP arrives by email → verify → you're logged in.
3. Post a listing with an image (confirms Cloudinary).
4. Open a second account, start a chat (confirms Socket.io / realtime).

If login "works then logs out on refresh", it's almost always a cookie issue:
verify `COOKIE_SECURE=true` on Render and that `CLIENT_URL` exactly matches the
Vercel origin (https, no trailing slash).

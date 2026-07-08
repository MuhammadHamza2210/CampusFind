# Deploying CampusFind

The app is two deployables — the **backend** (`server/`) on a **Hugging Face
Docker Space** and the **frontend** (`client/`) on Vercel — plus MongoDB Atlas,
Cloudinary, and SMTP.

Config included in this repo:

- `server/Dockerfile` + `server/.dockerignore` — containerized backend build
  (port 7860, non-root user) for Hugging Face or any Docker host.
- `client/vercel.json` — SPA rewrite so deep links (`/dashboard`, `/listings/:id`)
  don't 404 on refresh.
- `.node-version` (22) in both packages for reproducible builds.

---

## 1. Backend → Hugging Face Docker Space

Full walkthrough in **`DEPLOY_HUGGINGFACE.md`**. In short: create a **Docker**
Space, add a Dockerfile that builds `server/`, and set your env vars/secrets
(`MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `SMTP_*`, plus `COOKIE_SECURE=true`
and `CLIENT_URL`). The API comes up at
`https://<your-hf-username>-campusfind-api.hf.space`.

> Free Space note: it sleeps after ~48h idle and wakes on the next request.

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
verify `COOKIE_SECURE=true` on the backend and that `CLIENT_URL` exactly matches
the Vercel origin (https, no trailing slash).

# Deploying the backend on Hugging Face (Docker Space)

The CampusFind backend is a long-running Node server with WebSockets (Socket.io),
so it runs on a **Docker Space** (not Gradio/Static). The frontend still goes on
Vercel — see `DEPLOYMENT.md`.

There are two ways to run it on HF. **Option A (clone) is recommended** for this
monorepo — the Space stays tiny and pulls the code from GitHub at build time.

---

## Option A — minimal Space that clones from GitHub (recommended)

### 1. Create the Space
huggingface.co → **New → Space** → Name: `campusfind-api` → License: MIT →
**SDK: Docker → Blank** → Hardware: **CPU basic (free)** → Create.
HF creates a Space repo with a `README.md` that already has the required
`sdk: docker` metadata — leave that file as-is.

### 2. Add a Dockerfile
In the Space: **Files → + Add file → Create a new file**, name it `Dockerfile`,
paste this, and commit:

```dockerfile
FROM node:22-slim

# git + CA certs so git can verify GitHub's HTTPS certificate.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# node:22 already ships a `node` user at UID 1000 — the ID HF runs as.
USER node
ENV HOME=/home/node PATH=/home/node/.local/bin:$PATH
WORKDIR /home/node/app

# Cache-bust: this URL's content changes on every new commit, forcing the clone
# below to re-run instead of reusing a stale cached layer.
ADD https://api.github.com/repos/MuhammadHamza2210/CampusFind/commits/main /tmp/commit.json

# Pull the backend source and build it.
RUN git clone --depth 1 https://github.com/MuhammadHamza2210/CampusFind.git .
WORKDIR /home/node/app/server
RUN npm ci && npm run build && npm prune --omit=dev

ENV NODE_ENV=production PORT=7860
EXPOSE 7860
CMD ["node", "dist/index.js"]
```

> To redeploy after pushing new code to GitHub: Space → **Settings → Factory
> rebuild** (the clone always pulls the latest `main`).

### 3. Set secrets
Space → **Settings → Variables and secrets** → add (use **Secret** for the
sensitive ones, **Variable** for the rest):

| Key | Kind | Value |
| --- | --- | --- |
| `MONGODB_URI` | secret | your Atlas connection string |
| `JWT_SECRET` | secret | a long random string |
| `COOKIE_SECURE` | variable | `true` |
| `CLIENT_URL` | variable | `https://<your-app>.vercel.app` (set after Vercel) |
| `ALLOWED_EMAIL_DOMAIN` | variable | `bahria.edu.pk` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` | variable | from Cloudinary |
| `CLOUDINARY_API_SECRET` | secret | from Cloudinary |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `MAIL_FROM` | variable | see below |
| `SMTP_PASS` | secret | Gmail app password |
| `ADMIN_EMAILS` | variable | optional, comma-separated |

The Space rebuilds and boots on port 7860. Your API base URL is:

```
https://<your-hf-username>-campusfind-api.hf.space
```

---

## Option B — push this repo to the Space

Use the committed `server/Dockerfile` instead. Add HF as a remote and push, but
note HF needs the Docker metadata in the **root `README.md`** and the Dockerfile
at the Space-repo root, which is awkward in a monorepo — hence Option A is
preferred. (The `server/Dockerfile` is still handy for Fly.io / Railway / Koyeb /
a VPS, which build fine from the `server/` directory.)

---

## Wire the frontend to it

1. Deploy the frontend on Vercel (root dir `client/`) with
   `VITE_API_URL = https://<your-hf-username>-campusfind-api.hf.space`.
2. Back on the Space, set `CLIENT_URL` to your `https://<app>.vercel.app` URL and
   Factory-rebuild.

## Gotchas

- **Email/OTP:** without SMTP, signup codes only print to the Space logs and real
  users can't verify. Add SMTP (Gmail app password is easiest — see `DEPLOYMENT.md`).
- **Cookies:** keep `COOKIE_SECURE=true` and make `CLIENT_URL` exactly match the
  Vercel origin (https, no trailing slash), or login won't persist across refresh.
- **Free Space sleeps** after ~48h idle and wakes on the next request.
- **Port:** the app must listen on **7860** (the Dockerfile sets `PORT=7860`). If
  HF can't reach it, add `app_port: 7860` to the Space `README.md` frontmatter.

# Container image for the CampusFind backend (Express + Socket.io).
# Listens on 7860 so it runs as-is on a Hugging Face Docker Space; set the PORT
# env var to override on any other Docker host (Fly.io, Railway, Koyeb, a VPS…).

# ---- build stage: compile TypeScript ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage: prod deps + compiled output only ----
FROM node:22-slim
# node:22 already ships a `node` user at UID 1000 — the ID Hugging Face expects.
USER node
WORKDIR /home/node/app
COPY --chown=node package*.json ./
RUN npm ci --omit=dev
COPY --chown=node --from=build /app/dist ./dist
ENV NODE_ENV=production PORT=7860
EXPOSE 7860
CMD ["node", "dist/index.js"]

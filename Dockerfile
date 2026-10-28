# --- Stage 1: Build ---------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Prima solo i manifest delle dipendenze: il layer di `npm ci` resta in cache
# finché package-lock.json non cambia. `ci` (non `install`) rispetta il lockfile
# alla lettera e fallisce se è disallineato da package.json.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .
RUN npm run build -- --configuration production

# --- Stage 2: Serve ---------------------------------------------------------
# nginx-unprivileged: gira come UID 101 e ascolta sulla 8080, così il pod può
# avere runAsNonRoot senza capability aggiuntive.
FROM nginxinc/nginx-unprivileged:1.29-alpine-slim

COPY nginx.conf /etc/nginx/conf.d/default.conf
# Solo la parte browser: il server SSR (dist/.../server) non serve, le route
# sono prerenderizzate o renderizzate lato client (vedi nginx.conf).
COPY --from=build /app/dist/san-martino-user-panel/browser /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

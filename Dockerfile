# Build Stage
FROM node:20-slim AS build

# Sicherheits-Updates und Build-Abhängigkeiten
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Abhängigkeiten kopieren
COPY package*.json ./
RUN npm ci --only=production || npm install

# Quellcode kopieren
COPY . .
RUN npm run build

# Production Stage (Harden Nginx)
FROM nginxinc/nginx-unprivileged:stable-alpine

# Kopiere gebaute Dateien
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx Konfiguration für SPA, Security Headers & Audit Logging
RUN echo 'log_format audit_json '\''{"time":"$time_iso8601","remote_addr":"$remote_addr","request":"$request","status":$status,"body_bytes_sent":$body_bytes_sent,"http_referer":"$http_referer","http_user_agent":"$http_user_agent","request_time":$request_time}'\''; \
\
server { \
    listen 3000; \
    server_tokens off; \
    access_log /dev/stdout audit_json; \
    \
    # Security Headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always; \
    add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\''; style-src '\''self'\'' '\''unsafe-inline'\'' https://fonts.googleapis.com; font-src '\''self'\'' https://fonts.gstatic.com; img-src '\''self'\'' data: blob:; connect-src '\''self'\'' https://*;" always; \
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
    \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Endpoint für Healthchecks (WAF/Orchestrator) \
    location /health { \
        access_log off; \
        add_header Content-Type text/plain; \
        return 200 "healthy"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Port 3000 (standardisiert)
EXPOSE 3000

# Healthcheck für Container-Orchestrierung
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Nginx läuft bereits als non-root im 'nginxinc/nginx-unprivileged' Image
CMD ["nginx", "-g", "daemon off;"]

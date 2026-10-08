# ============================================
# DOCKERFILE - FRONTEND (React + Vite)
# ============================================

# --- STAGE 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Argumento para la URL del API (sin /api/v1, el código lo agrega)
ARG VITE_API_URL=https://tickify2.duckdns.org

# Copiar package.json primero (para cache)
COPY package*.json ./

# Instalar dependencias
RUN npm install --legacy-peer-deps

# Copiar código fuente
COPY . .

# Crear archivo .env para el build
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env

# Build de producción
RUN npm run build

# --- STAGE 2: Serve con Nginx ---
FROM nginx:alpine

# Copiar build al directorio de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx para SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

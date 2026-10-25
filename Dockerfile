# syntax=docker/dockerfile:1
# Imagem única: a API (Express) serve também o site (React já compilado).
# Build:  docker build -t confeitaria .
# Rodar:  docker run -p 3333:3333 -v confeitaria-data:/data -e JWT_SECRET=... -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... confeitaria

# ---------- 1) Build ----------
FROM node:20-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund

COPY . .
# Compila API + site e remove as dependências de desenvolvimento
# (o CLI do Prisma fica, pois é dependência de produção: roda o "migrate deploy")
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

# ---------- 2) Runtime ----------
FROM node:20-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3333 \
    DATABASE_URL=file:/data/prod.db \
    UPLOAD_DIR=/data/uploads \
    TRUST_PROXY=1

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/api/package.json ./api/
COPY --from=build --chown=node:node /app/api/dist ./api/dist
COPY --from=build --chown=node:node /app/api/prisma ./api/prisma
COPY --from=build --chown=node:node /app/api/scripts ./api/scripts
COPY --from=build --chown=node:node /app/web/dist ./web/dist

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3333
WORKDIR /app/api
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3333)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Gera o client do Prisma para o banco configurado, aplica as migrations e sobe o servidor
CMD ["npm", "run", "start:prod"]

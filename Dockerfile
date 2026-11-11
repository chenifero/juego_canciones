# ── 1) Compilar la web ──
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY shared shared
COPY web web
RUN npm run build -w web

# ── 2) Imagen final: servidor (TypeScript ejecutado por Node 24) + web compilada ──
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace server --include-workspace-root && npm cache clean --force
COPY shared shared
COPY server/src server/src
COPY --from=build /app/web/dist web/dist
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
CMD ["node", "server/src/index.ts"]

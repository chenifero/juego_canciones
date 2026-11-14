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
COPY docker-entrypoint.sh /usr/local/bin/barma-entrypoint
RUN apk add --no-cache su-exec && chmod +x /usr/local/bin/barma-entrypoint
ENV PORT=8080 DATA_DIR=/data
EXPOSE 8080
# El servidor corre como el usuario «node», sin permisos de root.
# El volumen /data lo monta Fly al arrancar y es de root: el arranque le da la carpeta a «node»
# y después cambia de usuario (su-exec), así que el proceso de Node nunca es root.
ENTRYPOINT ["barma-entrypoint"]
CMD ["node", "server/src/index.ts"]

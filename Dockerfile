# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts firebase-applet-config.json ./
COPY src/ ./src/
COPY shared/ ./shared/
COPY server/ ./server/
COPY server.ts ./
COPY public/ ./public/
COPY scripts/verify-build.mjs ./scripts/verify-build.mjs
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 ERP_SCHEMA_APPROVED=false
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY --from=build --chown=node:node /app/dist/ ./dist/
COPY --from=build --chown=node:node /app/server-dist/server.cjs ./server-dist/server.cjs
USER node
EXPOSE 8080
CMD ["node", "server-dist/server.cjs"]

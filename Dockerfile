# Breakout Beasts! game server (serves the client and the WebSocket multiplayer endpoint /ws)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY shared ./shared
COPY client ./client
ENV PORT=8080 HOST=0.0.0.0
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/healthz" || exit 1
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
CMD ["node", "server/index.js"]

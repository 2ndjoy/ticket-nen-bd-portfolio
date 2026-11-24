FROM node:22-bookworm-slim AS client
WORKDIR /build
COPY client/package*.json ./
RUN npm ci --include=dev
COPY client/ ./
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client /build/build /app/client/build
USER node
EXPOSE 5000
CMD ["node", "server.js"]

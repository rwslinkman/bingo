FROM node:23-slim AS builder
WORKDIR /app

WORKDIR /app/server
COPY server/ ./
RUN npm ci --production
RUN npx tsc

WORKDIR /app/client
COPY client/ ./
RUN npm ci
RUN npm run build

# Final image
FROM node:23-slim
WORKDIR /app

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "dist/server.js" ]
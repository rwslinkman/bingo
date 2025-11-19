# Use Node 18 LTS
FROM node:25-bullseye-slim AS builder


# Create app directory
WORKDIR /app


# Copy server and client package.json
COPY server/package*.json server/
COPY client/package*.json client/


# Install server deps
WORKDIR /app/server
RUN npm ci --production


# Install client deps and build
WORKDIR /app/client
RUN npm ci
COPY client/ ./
RUN npm run build


# Final image
FROM node:25-bullseye-slim
WORKDIR /app


# Copy server runtime files
COPY --from=builder /app/server ./server
# Copy built client
COPY --from=builder /app/client/dist ./client/dist


WORKDIR /app/server


EXPOSE 3000


ENV NODE_ENV=production


CMD [ "node", "index.js" ]
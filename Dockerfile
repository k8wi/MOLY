# syntax = docker/dockerfile:1

# Build stage
FROM node:18-bullseye-slim as build

WORKDIR /app

# Copy root package.json
COPY package.json ./

# Copy frontend and install/build
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Production stage
FROM node:18-bullseye-slim

# Install sqlite3 dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY backend ./backend
WORKDIR /app/backend
RUN npm install --production

# Copy built frontend
COPY --from=build /app/frontend/dist /app/frontend/dist

# Set permissions for the sqlite database directory
RUN mkdir -p /data
RUN chmod 777 /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/jira_clone.db

EXPOSE 3001

# Run the server
CMD ["node", "server.js"]

# Multi-stage build for Next.js + Prisma
# Uses Debian-based image to avoid musl/OpenSSL issues with Prisma

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client and build Next.js
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# Copy only the artifacts needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 8080
# Apply DB schema on container start, then run the server
CMD sh -c "npx prisma migrate deploy || echo 'prisma migrate deploy failed (continuing)'; npm run start"

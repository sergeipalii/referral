# syntax=docker/dockerfile:1.7
# Build context is the monorepo root.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend ./apps/backend
RUN npm -w @referral-system/backend run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/backend
RUN apk add --no-cache wget
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/package-lock.json /app/package-lock.json
COPY --from=build /app/tsconfig.json /app/tsconfig.json
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/src ./src
COPY --from=build /app/apps/backend/tsconfig.json ./tsconfig.json
COPY --from=build /app/apps/backend/tsconfig.build.json ./tsconfig.build.json
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
CMD ["sh", "-c", "npm run migration:run && node dist/main"]

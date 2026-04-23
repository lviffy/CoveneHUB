# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Install all dependencies needed to compile TypeScript.
COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install only runtime dependencies for a smaller final image.
COPY package.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/server.js"]

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S smartkit && adduser -S smartkit -G smartkit
COPY --from=deps /app/node_modules ./node_modules
# Asegurar permisos para la base de datos JSON
COPY package*.json ./
COPY backend ./backend
COPY dist ./dist
USER smartkit
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD node backend/src/healthcheck.js
CMD ["node", "backend/src/server.js"]

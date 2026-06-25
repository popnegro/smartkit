FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Crear carpetas de datos con permisos adecuados
RUN mkdir -p data/kits && chown -R node:node data

USER node

EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "backend/server.js"]
FROM node:20-alpine

WORKDIR /app

# Dependencias mínimas
RUN apk add --no-cache curl

# Instalar dependencias npm
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copiar archivos de código
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["node", "src/server.js"]

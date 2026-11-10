FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_POCKETBASE_URL=""
ARG VITE_ASAAS_API_URL="https://api.asaas.com/v3"
ARG VITE_ASAAS_ENV="production"
ARG ASAAS_API_URL=""
ARG ASAAS_API_KEY=""

ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL \
    VITE_ASAAS_API_URL=$VITE_ASAAS_API_URL \
    VITE_ASAAS_ENV=$VITE_ASAAS_ENV \
    ASAAS_API_URL=$ASAAS_API_URL \
    ASAAS_API_KEY=$ASAAS_API_KEY

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=builder /app/dist ./dist

ENV PORT=3001 \
    NODE_ENV=production

EXPOSE 3001

CMD ["node", "server/superadmin_server.js"]

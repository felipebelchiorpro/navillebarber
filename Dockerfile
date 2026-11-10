FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_POCKETBASE_URL=""
ARG ASAAS_API_KEY=""
ARG ASAAS_API_URL=""
ARG ASAAS_MASTER_WALLET_ID=""
ARG VITE_ASAAS_API_KEY=""
ARG VITE_ASAAS_API_KEY_PRODUCTION=""
ARG VITE_ASAAS_API_URL=""
ARG VITE_ASAAS_MASTER_WALLET_ID=""
ARG VITE_ASAAS_ENV=""

ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL \
    ASAAS_API_KEY=$ASAAS_API_KEY \
    ASAAS_API_URL=$ASAAS_API_URL \
    ASAAS_MASTER_WALLET_ID=$ASAAS_MASTER_WALLET_ID \
    VITE_ASAAS_API_KEY=$VITE_ASAAS_API_KEY \
    VITE_ASAAS_API_KEY_PRODUCTION=$VITE_ASAAS_API_KEY_PRODUCTION \
    VITE_ASAAS_API_URL=$VITE_ASAAS_API_URL \
    VITE_ASAAS_MASTER_WALLET_ID=$VITE_ASAAS_MASTER_WALLET_ID \
    VITE_ASAAS_ENV=$VITE_ASAAS_ENV

RUN npm run build

FROM nginx:alpine

# Instala Node.js para executar o backend Express
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Instala apenas dependências de produção para o backend
COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY start.sh /start.sh
RUN tr -d '\r' < /start.sh > /start.sh.tmp && mv /start.sh.tmp /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]

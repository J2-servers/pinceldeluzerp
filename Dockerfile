FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_LOCAL_API_URL=
ARG VITE_LOCAL_API_TOKEN=
ENV VITE_LOCAL_API_URL=$VITE_LOCAL_API_URL
ENV VITE_LOCAL_API_TOKEN=$VITE_LOCAL_API_TOKEN
RUN npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=frontend-build /app/dist /app/dist
COPY server /app/server
COPY scripts /app/scripts
COPY erp-schema /app/erp-schema
COPY database /app/database
COPY public /app/public
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/start.sh /app/docker/start.sh

ENV PINCEL_LUZ_API_HOST=127.0.0.1
ENV PINCEL_LUZ_API_PORT=8787
ENV PINCEL_LUZ_DB=/app/database/pincel-luz-erp.sqlite
ENV PINCEL_LUZ_ALLOWED_ORIGINS=
ENV PYTHONUNBUFFERED=1

RUN chmod +x /app/docker/start.sh \
  && mkdir -p /app/database /app/storage/uploads /app/storage/backups /run/nginx

VOLUME ["/app/database", "/app/storage"]
EXPOSE 8080
CMD ["/app/docker/start.sh"]

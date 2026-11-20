FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Vite inlines VITE_API_URL at build time. Empty = same origin (the Caddy proxy below).
FROM dev AS build
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine AS prod
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# Development image for the Vite server (ADR 0001). Docker Compose mounts the source over /app
# and keeps the node_modules installed here in a volume of its own.
FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

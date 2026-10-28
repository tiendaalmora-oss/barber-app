# Build & Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /app/data
EXPOSE 80
ENV PORT=80
CMD ["node", "server.js"]

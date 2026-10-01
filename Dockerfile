FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Run DB seed if needed
RUN npm run db:seed

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "src/app.js"]

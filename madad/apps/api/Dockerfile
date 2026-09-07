FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build
EXPOSE 4000
CMD ["node", "dist/src/server.js"]

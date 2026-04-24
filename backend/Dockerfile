FROM node:22 AS dev
WORKDIR /app
COPY package*.json tsconfig.json /app/
RUN npm ci
COPY . . 
EXPOSE 3000
CMD ["sh", "-c", "npm run db:deploy && npm run dev"]


FROM node:22 AS prod
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . . 
RUN npx prisma generate
RUN npx tsc
CMD ["sh", "-c", "npm run db:deploy && node dist/server.js"]

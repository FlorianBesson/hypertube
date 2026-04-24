FROM node:24-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM node:24-alpine AS prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD npm run build

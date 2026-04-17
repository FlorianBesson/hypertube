FROM node:lts AS dev
WORKDIR /app

COPY package*.json tsconfig.json /app/
RUN npm install

COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "run", "dev"]
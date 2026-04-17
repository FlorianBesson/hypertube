FROM node:lts AS development
WORKDIR /app

COPY package*.json /app
RUN npm install

COPY src/ ./src/

EXPOSE 3000

CMD ["npm", "run", "start"]
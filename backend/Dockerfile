FROM node:22 AS dev
WORKDIR /app



COPY package*.json tsconfig.json /app/

RUN npm ci

# Copie tout le dossier backend mais pas top car y'a des fichiers
# comme .env .gitignore
COPY . . 

EXPOSE 3000

CMD ["sh", "-c", "npm run db:deploy && npm run dev"]
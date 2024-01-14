# Utiliser une image Node.js comme base
FROM node:16-alpine as build

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY ./package*.json ./

# Installer les dépendances
RUN npm install --only=production

# Copier les fichiers de build et les autres nécessaires à l'exécution
COPY ./dist ./dist
COPY ./prisma ./prisma
COPY ./.env ./

# Après avoir copié les fichiers nécessaires
RUN npx prisma generate

# Port sur lequel votre app tourne
EXPOSE 3000

# Commande pour démarrer l'application
CMD ["node", "dist/main"]

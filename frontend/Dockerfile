# Étape de build
FROM node:16-alpine as build

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY ./package*.json ./

# Installer les dépendances
RUN npm install

# Copier les fichiers de source
COPY ./ .

# Construire l'app pour la production
RUN npm run build

# Étape de run
FROM nginx:alpine

# Copier les fichiers de build depuis l'étape de build
COPY --from=build /usr/src/app/dist/frontend /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]

# --- Stage 1: Build ---
FROM node:22-alpine AS build
WORKDIR /app

# Copia i file di dipendenze
COPY package*.json ./
RUN npm install

# Copia il resto del codice
COPY . .

# Build dell'applicazione
RUN npm run build -- --configuration production

# --- Stage 2: Serve ---
FROM nginx:alpine
# Copia la build di Angular nella cartella di default di Nginx
# Adatta il path se il nome del progetto in angular.json è diverso
COPY --from=build /app/dist/san-martino-user-panel/browser /usr/share/nginx/html
# Copia eventuale config nginx personalizzata per gestire il routing SPA
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

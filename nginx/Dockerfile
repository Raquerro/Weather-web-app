# Etap 1: build React
FROM node:20-alpine AS react-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
# puste zmienne – React użyje relatywnych URL-i przez nginx
ENV REACT_APP_API_URL=""
ENV REACT_APP_AUTH_URL=""
RUN npm run build

# Etap 2: nginx serwuje pliki statyczne
FROM nginx:alpine
COPY --from=react-build /app/build /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
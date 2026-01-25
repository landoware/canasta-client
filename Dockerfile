# Build the Vue.js application
FROM node:current-alpine AS build
COPY . ./app
WORKDIR /app
RUN npm install
RUN npm run build

# Final Nginx container
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

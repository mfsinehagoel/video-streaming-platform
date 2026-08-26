FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

CMD ["sh", "-c", "cp -r /app/dist/frontend/browser/. /usr/share/frontend-dist/"]
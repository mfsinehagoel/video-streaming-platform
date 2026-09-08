# FROM node:22-alpine

# WORKDIR /app

# RUN apk add --no-cache ffmpeg

# COPY package*.json ./

# RUN npm ci

# COPY tsconfig.json ./
# COPY src ./src

# RUN npm run build

# CMD ["npm", "start"]

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY worker/package*.json ./worker/
COPY shared/package*.json ./shared/

WORKDIR /app/worker

RUN npm ci

WORKDIR /app

COPY worker/tsconfig.json ./worker/
COPY worker/src ./worker/src

COPY shared ./shared

WORKDIR /app/worker

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
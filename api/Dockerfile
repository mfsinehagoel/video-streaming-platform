FROM node:22-alpine

WORKDIR /app

# Install FFmpeg (includes FFprobe)
RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
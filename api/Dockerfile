FROM node:22-alpine

WORKDIR /app

# API dependencies
COPY api/package*.json ./api/

WORKDIR /app/api
RUN npm ci

# Shared package
COPY shared/package*.json ../shared/

WORKDIR /app/shared
RUN npm ci

# Remove shared's own Sequelize installation
# and point it to API's Sequelize installation.
RUN rm -rf node_modules/sequelize \
    && ln -s /app/api/node_modules/sequelize node_modules/sequelize

# Copy shared source
COPY shared/tsconfig.json ./
COPY shared/config ./config
COPY shared/models ./models
COPY shared/services ./services
COPY shared/index.ts ./

RUN npm run build

# Copy API source
WORKDIR /app/api

COPY api/tsconfig.json ./
COPY api/src ./src

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
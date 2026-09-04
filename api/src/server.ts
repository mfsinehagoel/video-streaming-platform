import app from "./app";
import { sequelize } from "./config/database";

import { initializeRedis } from "./config/redis";

import { initializeRabbitMQ } from './config/rabbitmq';

import { initializeMinIO } from './config/minio-init';

import "./models";

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    await sequelize.authenticate();

    await sequelize.sync();

	await initializeRedis();

	await initializeRabbitMQ();

	await initializeMinIO();

    app.listen(Number(PORT), "0.0.0.0");
  } catch (error) {
    process.exit(1);
  }
}

startServer();

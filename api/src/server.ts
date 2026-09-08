import app from "./app";
import { sequelize } from "@video-platform/shared";

import { initializeRedis } from "@video-platform/shared";

import { initializeRabbitMQ } from '@video-platform/shared';

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

import app from "./app";
import { sequelize } from "./config/database";

import { initializeRabbitMQ } from './config/rabbitmq';

import { initializeMinIO } from './config/minio-init';

import "./models";

const PORT = process.env.PORT || 8080;

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log("MySQL connected successfully");

    await sequelize.sync();

    console.log("Database synchronized successfully");

	await initializeRabbitMQ();

	await initializeMinIO();

    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MySQL connection failed:", error);
    process.exit(1);
  }
}

startServer();

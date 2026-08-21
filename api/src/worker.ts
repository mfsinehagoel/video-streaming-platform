import {
  initializeRabbitMQ,
  getRabbitMQChannel,
  PROCESSING_QUEUE,
} from "./config/rabbitmq";
import { sequelize } from "./config/database";
import { ProcessingJob } from "./models";

async function startWorker() {
  try {
    await sequelize.authenticate();

    console.log("Worker: MySQL connected successfully");

    await sequelize.sync();

    console.log("Worker: Database synchronized successfully");

    await initializeRabbitMQ();

    const channel = getRabbitMQChannel();

    await channel.prefetch(1);

    console.log(`Worker listening on "${PROCESSING_QUEUE}"`);

    channel.consume(PROCESSING_QUEUE, async (message) => {
      if (!message) {
        return;
      }

      try {
        const job = JSON.parse(message.content.toString());

        console.log("Received processing job:", job);

        const { jobId, videoId } = job;

        if (!jobId || !videoId) {
          throw new Error(
            "Invalid processing job: jobId or videoId is missing",
          );
        }

        await ProcessingJob.update(
          {
            status: "PROCESSING",
            startedAt: new Date(),
            attempts: sequelize.literal("attempts + 1"),
          },
          {
            where: {
              id: jobId,
            },
          },
        );

        console.log(`Processing video ${videoId}, job ${jobId}`);

        // FFprobe / FFmpeg will be added here later.

        await ProcessingJob.update(
          {
            status: "COMPLETED",
            completedAt: new Date(),
          },
          {
            where: {
              id: jobId,
            },
          },
        );

        console.log(`Job ${jobId} completed`);

        channel.ack(message);
      } catch (error) {
        console.error("Worker processing failed:", error);

        channel.nack(message, false, false);
      }
    });
  } catch (error) {
    console.error("Worker startup failed:", error);
    process.exit(1);
  }
}

startWorker();

import { getRabbitMQChannel, PROCESSING_QUEUE } from "../config/rabbitmq";

export async function enqueueVideoProcessing(jobId: number, videoId: number) {
  const channel = getRabbitMQChannel();

  const message = {
    jobId,
    videoId,
  };

  channel.sendToQueue(PROCESSING_QUEUE, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  console.log(`Video processing job ${jobId} queued for video ${videoId}`);
}

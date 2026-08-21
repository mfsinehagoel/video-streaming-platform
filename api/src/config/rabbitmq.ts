import amqp, { Channel, ChannelModel } from "amqplib";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";

export const PROCESSING_QUEUE = "video-processing";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function initializeRabbitMQ(): Promise<void> {
  const conn = await amqp.connect(RABBITMQ_URL);

  const ch = await conn.createChannel();

  await ch.assertQueue(PROCESSING_QUEUE, {
    durable: true,
  });

  connection = conn;
  channel = ch;

  console.log("RabbitMQ connected successfully");
}

export function getRabbitMQChannel(): Channel {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  return channel;
}

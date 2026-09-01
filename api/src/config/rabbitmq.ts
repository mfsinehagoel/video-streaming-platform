import amqp, { Channel, ChannelModel } from "amqplib";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";

export const PROCESSING_QUEUE = "video-processing";

export const DEAD_LETTER_EXCHANGE = "video-processing-dlx";
export const DEAD_LETTER_QUEUE = "video-processing-dlq";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function initializeRabbitMQ(): Promise<void> {
  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();

  // Dead-letter exchange
  await ch.assertExchange(DEAD_LETTER_EXCHANGE, "direct", {
    durable: true,
  });

  // Dead-letter queue
  await ch.assertQueue(DEAD_LETTER_QUEUE, {
    durable: true,
  });

  // Bind DLQ to DLX
  await ch.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, PROCESSING_QUEUE);

  // Main processing queue
  await ch.assertQueue(PROCESSING_QUEUE, {
    durable: true,
    deadLetterExchange: DEAD_LETTER_EXCHANGE,
    deadLetterRoutingKey: PROCESSING_QUEUE,
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

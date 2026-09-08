import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (error) => {
  console.error("Redis Client Error:", error);
});

redisClient.on("connect", () => {});

redisClient.on("ready", () => {});

export async function initializeRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export async function invalidateVideoListCache() {
  const keys = await redisClient.keys("videos:list:*");

  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}

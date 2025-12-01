import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

await redis.connect();

export const redisSub = redis.duplicate();
await redisSub.connect();

import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on("error", () => {
      /* swallow reconnect noise; callers handle miss */
    });
    return client;
  } catch {
    return null;
  }
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

export async function redisGet(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    if (redis.status !== "ready") await redis.connect();
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number,
): Promise<void> {
  if (!redis) return;
  try {
    if (redis.status !== "ready") await redis.connect();
    if (ttlSeconds) {
      await redis.set(key, value, "EX", ttlSeconds);
    } else {
      await redis.set(key, value);
    }
  } catch {
    /* optional cache */
  }
}

export async function redisSAdd(key: string, members: string[]): Promise<void> {
  if (!redis || members.length === 0) return;
  try {
    if (redis.status !== "ready") await redis.connect();
    await redis.sadd(key, ...members);
  } catch {
    /* optional index */
  }
}

export async function redisSMembers(key: string): Promise<string[]> {
  if (!redis) return [];
  try {
    if (redis.status !== "ready") await redis.connect();
    return await redis.smembers(key);
  } catch {
    return [];
  }
}

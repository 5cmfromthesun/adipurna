const Redis = require('ioredis');

let redis = null;

const getRedis = () => {
  if (!redis) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || 6379;
    redis = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });
    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
    redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }
  return redis;
};

module.exports = { getRedis };

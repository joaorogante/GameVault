const { createClient } = require('redis');

let redisClient;

async function initRedis() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL nao definida no .env');
  }

  redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on('error', (err) => console.error('Redis error:', err));
  await redisClient.connect();
  console.log('✅ Redis conectado');
  return redisClient;
}

function getRedis() {
  return redisClient;
}

module.exports = { initRedis, getRedis };

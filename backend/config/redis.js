const { createClient } = require('redis');

let redisClient;

async function initRedis() {
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

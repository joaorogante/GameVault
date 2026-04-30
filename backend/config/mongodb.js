const { MongoClient } = require('mongodb');
const dns = require('dns');

let db;

async function initMongoDB() {
  if (!process.env.MONGODB_URL) {
    throw new Error('MONGODB_URL nao definida no .env');
  }

  if (process.env.MONGODB_DNS_SERVERS) {
    const servers = process.env.MONGODB_DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean);
    dns.setServers(servers);
  }

  const client = new MongoClient(process.env.MONGODB_URL);
  await client.connect();
  db = client.db('gamevault');
  await db.collection('games').createIndex({ name: 1 });
  await db.collection('games').createIndex({ genres: 1 });
  console.log('✅ MongoDB conectado — coleção games pronta');
  return db;
}

function getDB() {
  return db;
}

module.exports = { initMongoDB, getDB };

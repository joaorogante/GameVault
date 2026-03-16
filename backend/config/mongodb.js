const { MongoClient } = require('mongodb');

let db;

async function initMongoDB() {
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

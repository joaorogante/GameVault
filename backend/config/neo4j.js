const neo4j = require('neo4j-driver');

let driver;

async function initNeo4j() {
  if (!process.env.NEO4J_URI) {
    throw new Error('NEO4J_URI nao definida no .env');
  }

  if (!process.env.NEO4J_USERNAME) {
    throw new Error('NEO4J_USERNAME nao definida no .env');
  }

  if (!process.env.NEO4J_PASSWORD) {
    throw new Error('NEO4J_PASSWORD nao definida no .env');
  }

  driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
  );
  const session = driver.session({ database: process.env.NEO4J_DATABASE });
  try {
    await session.run('RETURN 1');
    console.log('✅ Neo4j conectado');
  } finally {
    await session.close();
  }
  return driver;
}

function getDriver() {
  if (!driver) {
    throw new Error('Neo4j nao conectado');
  }
  return driver;
}

module.exports = { initNeo4j, getDriver };

const neo4j = require('neo4j-driver');

let driver;

async function initNeo4j() {
  driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
  );
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('✅ Neo4j conectado');
  } finally {
    await session.close();
  }
  return driver;
}

function getDriver() {
  return driver;
}

module.exports = { initNeo4j, getDriver };

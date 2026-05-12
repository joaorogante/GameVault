require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initPostgres } = require('./config/postgres');
const { initMongoDB } = require('./config/mongodb');
const { initRedis } = require('./config/redis');
const { initNeo4j } = require('./config/neo4j');

const usersRoutes = require('./routes/users');
const gamesRoutes = require('./routes/games');
const reviewsRoutes = require('./routes/reviews');
const socialRoutes = require('./routes/social');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/users', usersRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/social', socialRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GameVault API rodando', databases: ['PostgreSQL', 'MongoDB', 'Redis', 'Neo4j'] });
});

async function start() {
  try {
    await initPostgres();
    await initMongoDB();
    await initRedis();
    try {
      await initNeo4j();
    } catch (err) {
      console.warn('⚠️ Neo4j indisponivel:', err.message);
    }

    app.listen(PORT, () => {
      console.log(`\n🎮 GameVault API rodando em http://localhost:${PORT}`);
      console.log(`\n   Rotas:`);
      console.log(`   [PostgreSQL] /api/users`);
      console.log(`   [MongoDB]    /api/games`);
      console.log(`   [Redis]      /api/reviews`);
      console.log(`   [Neo4j]      /api/social\n`);
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar:', err.message);
    process.exit(1);
  }
}

start();

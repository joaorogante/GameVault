const express = require('express');
const router = express.Router();
const { getRedis } = require('../config/redis');
const { getDriver } = require('../config/neo4j');

// CREATE review
router.post('/', async (req, res) => {
  try {
    const redis = getRedis();
    const { game_id, user_id, user_name, rating, comment } = req.body;
    const reviewId = `review:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    await redis.hSet(reviewId, {
      game_id, user_id: String(user_id), user_name,
      rating: String(rating), comment, created_at: new Date().toISOString()
    });
    await redis.sAdd(`game_reviews:${game_id}`, reviewId);
    await redis.sAdd(`user_reviews:${user_id}`, reviewId);

    // Recalcular média
    await recalcRating(redis, game_id);
    await syncReviewToGraph({ game_id, user_id, user_name, rating });

    res.status(201).json({ id: reviewId, game_id, user_name, rating: Number(rating), comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ reviews de um jogo
router.get('/game/:gameId', async (req, res) => {
  try {
    const redis = getRedis();
    const ids = await redis.sMembers(`game_reviews:${req.params.gameId}`);
    const reviews = [];
    for (const id of ids) {
      const r = await redis.hGetAll(id);
      if (r && r.game_id) reviews.push({ id, ...r, rating: Number(r.rating) });
    }
    reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ reviews de um usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const redis = getRedis();
    const userId = String(req.params.userId);
    const ids = new Set(await redis.sMembers(`user_reviews:${userId}`));

    for await (const key of redis.scanIterator({ MATCH: 'review:*', COUNT: 100 })) {
      const reviewUserId = await redis.hGet(key, 'user_id');
      if (String(reviewUserId) === userId) ids.add(key);
    }

    const reviews = [];
    for (const id of ids) {
      const r = await redis.hGetAll(id);
      if (r && r.game_id && String(r.user_id) === userId) {
        reviews.push({ id, ...r, rating: Number(r.rating) });
      }
    }

    reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ top jogos por rating
router.get('/top', async (req, res) => {
  try {
    const redis = getRedis();
    const top = await redis.zRangeWithScores('game_ratings', 0, 9, { REV: true });
    res.json(top.map(i => ({ game_id: i.value, average_rating: i.score })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE review
router.put('/:id', async (req, res) => {
  try {
    const redis = getRedis();
    const exists = await redis.exists(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Review não encontrada' });
    const { rating, comment } = req.body;
    await redis.hSet(req.params.id, { rating: String(rating), comment });
    const gameId = await redis.hGet(req.params.id, 'game_id');
    const userId = await redis.hGet(req.params.id, 'user_id');
    const userName = await redis.hGet(req.params.id, 'user_name');
    await recalcRating(redis, gameId);
    await syncReviewToGraph({ game_id: gameId, user_id: userId, user_name: userName, rating });
    const updated = await redis.hGetAll(req.params.id);
    res.json({ id: req.params.id, ...updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE review
router.delete('/:id', async (req, res) => {
  try {
    const redis = getRedis();
    const gameId = await redis.hGet(req.params.id, 'game_id');
    const userId = await redis.hGet(req.params.id, 'user_id');
    if (!gameId) return res.status(404).json({ error: 'Review não encontrada' });
    await redis.sRem(`game_reviews:${gameId}`, req.params.id);
    if (userId) await redis.sRem(`user_reviews:${userId}`, req.params.id);
    await redis.del(req.params.id);
    await removeReviewFromGraph({ game_id: gameId, user_id: userId });
    await recalcRating(redis, gameId);
    res.json({ message: 'Review excluída' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function recalcRating(redis, gameId) {
  const ids = await redis.sMembers(`game_reviews:${gameId}`);
  if (ids.length === 0) { await redis.zRem('game_ratings', gameId); return; }
  let total = 0;
  for (const id of ids) {
    const r = await redis.hGet(id, 'rating');
    if (r) total += Number(r);
  }
  await redis.zAdd('game_ratings', { score: total / ids.length, value: gameId });
}

async function syncReviewToGraph({ game_id, user_id, user_name, rating }) {
  let session;
  try {
    session = getDriver().session();
    await session.run(`
      MERGE (p:Player {userId: $userId})
      ON CREATE SET p.name = $userName
      ON MATCH SET p.name = $userName
      MERGE (g:Game {gameId: $gameId})
      MERGE (p)-[r:REVIEWED]->(g)
      SET r.rating = $rating, r.updatedAt = datetime()
    `, {
      userId: String(user_id),
      userName: user_name || String(user_id),
      gameId: String(game_id),
      rating: Number(rating)
    });
  } catch (err) {
    console.warn('Neo4j review sync falhou:', err.message);
  } finally {
    if (session) await session.close();
  }
}

async function removeReviewFromGraph({ game_id, user_id }) {
  if (!game_id || !user_id) return;

  let session;
  try {
    session = getDriver().session();
    await session.run(`
      MATCH (:Player {userId: $userId})-[r:REVIEWED]->(:Game {gameId: $gameId})
      DELETE r
    `, {
      userId: String(user_id),
      gameId: String(game_id)
    });
  } catch (err) {
    console.warn('Neo4j review delete sync falhou:', err.message);
  } finally {
    if (session) await session.close();
  }
}

module.exports = router;

const express = require('express');
const router = express.Router();
const { getDriver } = require('../config/neo4j');

// CREATE - Adicionar amizade
router.post('/friends', async (req, res) => {
  const session = getDriver().session();
  try {
    const { user_id, user_name, friend_id, friend_name } = req.body;
    await session.run(`
      MERGE (a:Player {userId: $user_id})
      ON CREATE SET a.name = $user_name
      ON MATCH SET a.name = $user_name
      MERGE (b:Player {userId: $friend_id})
      ON CREATE SET b.name = $friend_name
      ON MATCH SET b.name = $friend_name
      MERGE (a)-[:FRIENDS_WITH]->(b)
      MERGE (b)-[:FRIENDS_WITH]->(a)
    `, { user_id: String(user_id), user_name, friend_id: String(friend_id), friend_name });
    res.status(201).json({ message: `${user_name} e ${friend_name} agora são amigos!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// READ - Listar amigos de um usuário
router.get('/friends/:userId', async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (a:Player {userId: $userId})-[:FRIENDS_WITH]->(friend:Player)
      RETURN friend.userId AS id, friend.name AS name
    `, { userId: req.params.userId });
    const friends = result.records.map(r => ({ id: r.get('id'), name: r.get('name') }));
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// READ - Amigos em comum entre dois usuários
router.get('/common/:userId1/:userId2', async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (a:Player {userId: $id1})-[:FRIENDS_WITH]->(common:Player)<-[:FRIENDS_WITH]-(b:Player {userId: $id2})
      RETURN common.userId AS id, common.name AS name
    `, { id1: req.params.userId1, id2: req.params.userId2 });
    const common = result.records.map(r => ({ id: r.get('id'), name: r.get('name') }));
    res.json(common);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// READ - Sugestões de amigos (amigos dos amigos que não são seus amigos)
router.get('/suggestions/:userId', async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (a:Player {userId: $userId})-[:FRIENDS_WITH]->(friend)-[:FRIENDS_WITH]->(suggestion:Player)
      WHERE suggestion <> a AND NOT (a)-[:FRIENDS_WITH]->(suggestion)
      RETURN suggestion.userId AS id, suggestion.name AS name, COUNT(friend) AS mutualFriends
      ORDER BY mutualFriends DESC
      LIMIT 10
    `, { userId: req.params.userId });
    const suggestions = result.records.map(r => ({
      id: r.get('id'), name: r.get('name'), mutual_friends: r.get('mutualFriends').low || r.get('mutualFriends')
    }));
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// READ - Todos os jogadores no grafo
router.get('/players', async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run('MATCH (p:Player) RETURN p.userId AS id, p.name AS name ORDER BY p.name');
    const players = result.records.map(r => ({ id: r.get('id'), name: r.get('name') }));
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// UPDATE - Atualizar dados do jogador
router.put('/players/:userId', async (req, res) => {
  const session = getDriver().session();
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    const result = await session.run(`
      MATCH (p:Player {userId: $userId})
      SET p.name = $name
      RETURN p.userId AS id, p.name AS name
    `, { userId: req.params.userId, name });
    if (result.records.length === 0) return res.status(404).json({ error: 'Jogador não encontrado no grafo' });
    res.json({ id: result.records[0].get('id'), name: result.records[0].get('name') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// DELETE - Remover amizade
router.delete('/friends/:userId/:friendId', async (req, res) => {
  const session = getDriver().session();
  try {
    await session.run(`
      MATCH (a:Player {userId: $userId})-[r:FRIENDS_WITH]-(b:Player {userId: $friendId})
      DELETE r
    `, { userId: req.params.userId, friendId: req.params.friendId });
    res.json({ message: 'Amizade removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;

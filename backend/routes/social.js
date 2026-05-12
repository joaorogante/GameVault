const express = require('express');
const router = express.Router();
const { getDriver } = require('../config/neo4j');

router.use((req, res, next) => {
  try {
    getDriver();
    next();
  } catch (err) {
    res.status(503).json({ error: 'Neo4j indisponivel no momento' });
  }
});

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
// CREATE - Enviar pedido de amizade
router.post('/friend-requests', async (req, res) => {
  const session = getDriver().session();
  try {
    const { user_id, user_name, friend_id, friend_name } = req.body;

    if (String(user_id) === String(friend_id)) {
      return res.status(400).json({ error: 'Nao e possivel adicionar voce mesmo' });
    }

    const result = await session.run(`
      MERGE (a:Player {userId: $user_id})
      ON CREATE SET a.name = $user_name
      ON MATCH SET a.name = $user_name
      MERGE (b:Player {userId: $friend_id})
      ON CREATE SET b.name = $friend_name
      ON MATCH SET b.name = $friend_name
      WITH a, b
      OPTIONAL MATCH (a)-[friend:FRIENDS_WITH]-(b)
      OPTIONAL MATCH (b)-[reverseRequest:FRIEND_REQUEST]->(a)
      WITH a, b, friend, reverseRequest
      WHERE friend IS NULL AND reverseRequest IS NULL
      MERGE (a)-[request:FRIEND_REQUEST]->(b)
      ON CREATE SET request.createdAt = datetime()
      RETURN request
    `, { user_id: String(user_id), user_name, friend_id: String(friend_id), friend_name });

    if (result.records.length === 0) {
      return res.status(409).json({ error: 'Ja existe amizade ou pedido pendente entre esses usuarios' });
    }

    res.status(201).json({ message: 'Pedido de amizade enviado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// READ - Pedidos recebidos
router.get('/friend-requests/:userId', async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (requester:Player)-[request:FRIEND_REQUEST]->(:Player {userId: $userId})
      RETURN requester.userId AS id, requester.name AS name, request.createdAt AS created_at
      ORDER BY request.createdAt DESC
    `, { userId: req.params.userId });

    res.json(result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      created_at: String(r.get('created_at'))
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// UPDATE - Aceitar pedido de amizade
router.post('/friend-requests/:requesterId/:userId/accept', async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (requester:Player {userId: $requesterId})-[request:FRIEND_REQUEST]->(me:Player {userId: $userId})
      DELETE request
      MERGE (requester)-[:FRIENDS_WITH]->(me)
      MERGE (me)-[:FRIENDS_WITH]->(requester)
      RETURN requester.name AS name
    `, { requesterId: req.params.requesterId, userId: req.params.userId });

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Pedido de amizade nao encontrado' });
    }

    res.json({ message: 'Pedido aceito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// DELETE - Recusar/cancelar pedido de amizade
router.delete('/friend-requests/:requesterId/:userId', async (req, res) => {
  const session = getDriver().session();
  try {
    await session.run(`
      MATCH (:Player {userId: $requesterId})-[request:FRIEND_REQUEST]->(:Player {userId: $userId})
      DELETE request
    `, { requesterId: req.params.requesterId, userId: req.params.userId });

    res.json({ message: 'Pedido removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

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
      MATCH (a:Player {userId: $userId})
      MATCH path = (a)-[:FRIENDS_WITH*2..3]-(suggestion:Player)
      WHERE suggestion <> a
        AND NOT (a)-[:FRIENDS_WITH]-(suggestion)
        AND NOT (a)-[:FRIEND_REQUEST]-(suggestion)
      WITH a, suggestion, MIN(length(path)) AS distance
      OPTIONAL MATCH (a)-[:FRIENDS_WITH]->(mutual:Player)-[:FRIENDS_WITH]->(suggestion)
      RETURN
        suggestion.userId AS id,
        suggestion.name AS name,
        distance AS distance,
        COUNT(DISTINCT mutual) AS mutualFriends
      ORDER BY distance ASC, mutualFriends DESC, suggestion.name ASC
      LIMIT 10
    `, { userId: req.params.userId });
    const suggestions = result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      distance: r.get('distance').low || r.get('distance'),
      mutual_friends: r.get('mutualFriends').low || r.get('mutualFriends')
    }));
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// READ - Pessoas que tambem deram review nos mesmos jogos
router.get('/review-suggestions/:userId', async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
      MATCH (me:Player {userId: $userId})-[myReview:REVIEWED]->(game:Game)<-[theirReview:REVIEWED]-(other:Player)
      WHERE other <> me
        AND NOT (me)-[:FRIENDS_WITH]-(other)
        AND NOT (me)-[:FRIEND_REQUEST]-(other)
      WITH other, game, theirReview, myReview
      ORDER BY theirReview.rating DESC, myReview.rating DESC
      RETURN
        other.userId AS id,
        other.name AS name,
        game.gameId AS game_id,
        theirReview.rating AS rating,
        COUNT(game) AS sharedGames
      ORDER BY sharedGames DESC, rating DESC, name ASC
      LIMIT 10
    `, { userId: req.params.userId });

    const suggestions = result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      game_id: r.get('game_id'),
      rating: r.get('rating'),
      shared_games: r.get('sharedGames').low || r.get('sharedGames')
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

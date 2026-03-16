const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/mongodb');

// CREATE
router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { name, description, genres, platforms, image_url, release_year, developer } = req.body;
    const game = {
      name,
      description: description || '',
      genres: genres || [],
      platforms: platforms || [],
      image_url: image_url || '',
      release_year: release_year || null,
      developer: developer || '',
      created_at: new Date()
    };
    const result = await db.collection('games').insertOne(game);
    res.status(201).json({ _id: result.insertedId, ...game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ALL (com filtros opcionais)
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { genre, platform, search } = req.query;
    let filter = {};
    if (genre) filter.genres = genre;
    if (platform) filter.platforms = platform;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const games = await db.collection('games').find(filter).sort({ name: 1 }).toArray();
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const game = await db.collection('games').findOne({ _id: new ObjectId(req.params.id) });
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const db = getDB();
    const { name, description, genres, platforms, image_url, release_year, developer } = req.body;
    const result = await db.collection('games').findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, description, genres, platforms, image_url, release_year, developer } },
      { returnDocument: 'after' }
    );
    if (!result) return res.status(404).json({ error: 'Jogo não encontrado' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const result = await db.collection('games').findOneAndDelete({ _id: new ObjectId(req.params.id) });
    if (!result) return res.status(404).json({ error: 'Jogo não encontrado' });
    res.json({ message: 'Jogo excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

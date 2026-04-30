const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');

// CREATE
router.post('/', async (req, res) => {
  try {
    const { name, email, password, avatar_url } = req.body;
    const result = await pool.query(
      'INSERT INTO users (name, email, password, avatar_url) VALUES ($1, $2, $3, $4) RETURNING id, name, email, avatar_url, created_at',
      [name, email, password, avatar_url || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    const result = await pool.query(
      'SELECT id, name, email, avatar_url, created_at FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha invalidos' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, avatar_url, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const { name, email, password, avatar_url } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, password=$3, avatar_url=$4 WHERE id=$5 RETURNING id, name, email, avatar_url, created_at',
      [name, email, password, avatar_url || '', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário excluído' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

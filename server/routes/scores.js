const express = require('express');
const router = express.Router();
const Score = require('../models/Score');

// GET /api/scores - top 10 high scores
router.get('/', async (req, res) => {
  try {
    const scores = await Score.find().sort({ score: -1 }).limit(10);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// POST /api/scores - save a new score
router.post('/', async (req, res) => {
  try {
    const { playerName, score, level } = req.body;

    if (!playerName || typeof score !== 'number') {
      return res.status(400).json({ error: 'playerName and score are required' });
    }

    const newScore = new Score({
      playerName: playerName.slice(0, 20),
      score,
      level: level || 1,
    });

    await newScore.save();
    res.status(201).json(newScore);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

module.exports = router;

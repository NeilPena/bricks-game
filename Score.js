const mongoose = require('mongoose');

const ScoreSchema = new mongoose.Schema({
  playerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  level: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Score', ScoreSchema);

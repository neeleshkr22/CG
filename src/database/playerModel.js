const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  batting: { type: Number, required: true },
  bowling: { type: Number, required: true },
  cardValue: { type: Number, required: true },
  saleValue: { type: Number, required: true },
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;

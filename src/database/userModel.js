const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  balance: { type: Number, default: 1000 },
  teamValue: { type: Number, default: 0 },
  teamOvr: { type: Number, default: 0 },
  players: { type: Array, default: [] },
  cooldowns: {
  type: Object,
  default: {}
},

  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

module.exports = User;

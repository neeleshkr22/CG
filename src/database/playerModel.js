// const mongoose = require('mongoose');

// const playerSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   batting: { type: Number, required: true },
//   bowling: { type: Number, required: true },
//   cardValue: { type: Number, required: true },
//   saleValue: { type: Number, required: true },
// });

// const Player = mongoose.model('Player', playerSchema);

// module.exports = Player;

// playerModel.js (now loading from JSON)
// playerModel.js — File-based access to player data
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/player.json');

function loadPlayers() {
  const raw = fs.readFileSync(filePath);
  return JSON.parse(raw);
}

function getAllPlayers() {
  return loadPlayers();
}

function getRandomPlayer() {
  const players = loadPlayers();
  return players[Math.floor(Math.random() * players.length)];
}

function findPlayerByName(name) {
  const players = loadPlayers();
  return players.find(p => p.name.toLowerCase() === name.toLowerCase());
}

module.exports = {
  getAllPlayers,
  getRandomPlayer,
  findPlayerByName
};


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

function getTopPlayers(minOvr = 93) {
  const players = loadPlayers();
  return players.filter(p => p.OVR && p.OVR > minOvr);
}

module.exports = {
  getAllPlayers,
  getRandomPlayer,
  findPlayerByName,
  getTopPlayers,
};

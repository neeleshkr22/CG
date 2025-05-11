const fs = require('fs');
const path = require('path');
const { getTopPlayers } = require('../database/playerModel');
const generateMarketImage = require('../utils/generateMarketImage');

async function initMarket() {
  const topPlayers = getTopPlayers();
  const random = topPlayers.sort(() => 0.5 - Math.random()).slice(0, 5);

  const marketPath = path.join(__dirname, '../assets');
  if (!fs.existsSync(marketPath)) fs.mkdirSync(marketPath);

  const jsonPath = path.join(marketPath, 'market.json');
  fs.writeFileSync(jsonPath, JSON.stringify(random, null, 2), 'utf-8');

  await generateMarketImage(random, marketPath);
  console.log('✅ Daily market and image generated.');
}

initMarket();

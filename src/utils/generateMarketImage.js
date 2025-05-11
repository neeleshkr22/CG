const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function generateMarketImage(players, outputPath) {
  const cardWidth = 300;
  const cardHeight = 400;
  const gap = 10;
  const canvas = createCanvas(cardWidth * players.length + gap * (players.length - 1), cardHeight);
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < players.length; i++) {
    const url = players[i].Card;

    try {
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());

      const image = await loadImage(buffer);
      const x = i * (cardWidth + gap);
      ctx.drawImage(image, x, 0, cardWidth, cardHeight);
    } catch (err) {
      console.warn(`⚠️ Failed to load image for ${players[i].Name || 'Unknown'}: ${url}`);
      // Draw placeholder red rectangle
      const x = i * (cardWidth + gap);
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(x, 0, cardWidth, cardHeight);
      ctx.fillStyle = '#FFF';
      ctx.font = '20px Arial';
      ctx.fillText('Image Error', x + 50, 200);
    }
  }

  const finalPath = path.join(outputPath, 'daily_market_5players.png');
  const out = fs.createWriteStream(finalPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise(resolve => {
    out.on('finish', () => resolve(finalPath));
  });
}

module.exports = generateMarketImage;

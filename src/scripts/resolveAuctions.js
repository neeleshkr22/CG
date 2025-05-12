// src/scripts/resolveAuctions.js
const mongoose = require('mongoose');
const Auction = require('../database/auctionModel');
const User = require('../database/userModel');
require('dotenv').config();

async function resolveAuctions() {
  await mongoose.connect(process.env.MONGO_URI);

  const now = new Date();
  const endedAuctions = await Auction.find({ endsAt: { $lte: now } });

  for (const auction of endedAuctions) {
    const winner = await User.findOne({ userId: auction.currentBidderId });
    const seller = await User.findOne({ userId: auction.sellerId });

    if (winner) {
      winner.players.splice(11, 0, auction.player); // Add to subs
    }

    if (seller) {
      seller.balance += auction.currentBid;
    }

    await Promise.all([
      winner?.save(),
      seller?.save(),
      Auction.deleteOne({ _id: auction._id })
    ]);

    console.log(`✅ Auction ended: ${auction.player.Name} sold to ${winner?.username || 'unknown'} for ${auction.currentBid} CG`);
  }

  await mongoose.disconnect();
}

resolveAuctions().catch(console.error);

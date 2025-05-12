const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  sellerId: { type: String, required: true },
  auctionId: { type: String, required: true, unique: true },
  sellerName: { type: String },
  player: { type: Object, required: true },
  startBid: { type: Number, required: true },
  currentBid: { type: Number, default: 0 },
  currentBidderId: { type: String, default: null },
  endsAt: { type: Date, required: true }
});

module.exports = mongoose.model('Auction', auctionSchema);

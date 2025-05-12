const User = require('../database/userModel');
const Auction = require('../database/auctionModel');

module.exports = {
  name: 'cmbid',
  description: 'Place a bid in an auction',
  async execute(message, args) {
    const name = args[0];
    const amount = parseInt(args[1]);

    if (!name || isNaN(amount)) {
      return message.reply('⚠️ Use format: `cmbid <playerName> <amount>`');
    }

    const auction = await Auction.findOne({ 'player.Name': new RegExp(`^${name}$`, 'i') });
    if (!auction) return message.reply('❌ No such auction found.');

    if (amount <= auction.currentBid) {
      return message.reply(`💸 Your bid must be higher than the current bid of **${auction.currentBid} CG**.`);
    }

    const bidder = await User.findOne({ userId: message.author.id });
    if (!bidder) return message.reply('❌ You are not registered. Use `cmdebut` first.');

    if (bidder.balance < amount) {
      return message.reply(`❌ You don't have enough balance. You need **${amount} CG**, but you only have **${bidder.balance} CG**.`);
    }

    // Refund previous highest bidder
    if (auction.currentBidderId) {
      const previousBidder = await User.findOne({ userId: auction.currentBidderId });
      if (previousBidder) {
        previousBidder.balance += auction.currentBid;
        await previousBidder.save();
      }
    }

    // Deduct new bidder's balance
    bidder.balance -= amount;
    await bidder.save();

    // Update auction
    auction.currentBid = amount;
    auction.currentBidderId = bidder.userId;
    await auction.save();

    return message.reply(`✅ You placed a bid of **${amount} CG** for **${auction.player.Name || auction.player.name}**.`);
  }
};

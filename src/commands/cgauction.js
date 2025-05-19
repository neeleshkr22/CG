const User = require('../database/userModel');
const Auction = require('../database/auctionModel');
const { EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid'); // to generate unique IDs

module.exports = {
  name: 'auction',
  description: 'Start or view ongoing player auctions',
  async execute(message, args) {
    const user = await User.findOne({ userId: message.author.id });
    if (!user) return message.reply('❌ You must register with `cmdebut` first.');

    if (args[0] === 'start') {
      const name = args[1];
      const startBid = parseInt(args[2]);
      const durationRaw = args[3]; // e.g. 30m, 1h

      if (!name || isNaN(startBid) || !durationRaw) {
        return message.reply('⚠️ Use format: `cmauction start <playerName> <startBid> <duration like 60m/2h/1d>`');
      }

      // Parse duration
      const match = durationRaw.match(/^(\d+)([mhd])$/i);
      if (!match) {
        return message.reply('⚠️ Duration must end with m (minutes), h (hours), or d (days). Example: `30m`, `2h`, `1d`');
      }

      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let durationMs = unit === 'm' ? value * 60000 : unit === 'h' ? value * 3600000 : value * 86400000;

      // Find player by partial name
      const index = user.players.findIndex(p =>
        (p.Name || p.name || '').toLowerCase().includes(name.toLowerCase())
      );

      if (index === -1)
        return message.reply(`❌ Player matching "${name}" not found in your team.`);

      const player = user.players[index];
      user.players.splice(index, 1); // remove from team
      await user.save();

      const auctionId = uuidv4().slice(0, 6); // shorten to 6 characters
      const endsAt = new Date(Date.now() + durationMs);

      await Auction.create({
        auctionId,
        sellerId: user.userId,
        sellerName: user.username,
        player,
        startBid,
        currentBid: startBid,
        currentBidderId: null,
        endsAt
      });

      return message.reply(`✅ Auction started for **${player.Name || player.name}** with ID \`${auctionId}\` at ${startBid} CG for ${value}${unit}.`);
    }

    // Show current auctions
    const allAuctions = await Auction.find();
    if (allAuctions.length === 0)
      return message.reply('📭 No auctions running right now.');

    const embed = new EmbedBuilder()
      .setTitle('🏷️ Current Auctions')
      .setColor('#FFD700')
      .setFooter({ text: 'Use `cmbid <auctionId> <amount>` to bid.' });

    allAuctions.forEach((a) => {
      const timeLeft = Math.max(0, Math.floor((a.endsAt - Date.now()) / 60000));
      embed.addFields({
        name: `${a.player.Name || a.player.name} [ID: ${a.auctionId}]`,
        value: `💰 Start: ${a.startBid} CG | Current: ${a.currentBid} CG\n👤 Seller: ${a.sellerName} | ⏳ Ends in: ${timeLeft} min`
      });
    });

    return message.channel.send({ embeds: [embed] });
  }
};

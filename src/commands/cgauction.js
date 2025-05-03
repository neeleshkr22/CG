const User = require('../database/userModel');
const Player = require('../database/playerModel');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cmauction',
  description: 'Bid in the player auction',
  async execute(message, args) {
    const playerName = args[0];
    const bidAmount = parseInt(args[1]);

    if (!playerName || !bidAmount || isNaN(bidAmount) || bidAmount <= 0) {
      return message.reply('Please provide a valid player name and bid amount (greater than 0 CG).');
    }

    const player = await Player.findOne({ name: playerName });
    if (!player) {
      return message.reply('Player not found.');
    }

    // Check if user has enough balance
    let user = await User.findOne({ userId: message.author.id });
    if (!user) {
      user = await User.create({
        userId: message.author.id,
        username: message.author.username,
        balance: 1000,   // Initial balance if no user
        teamValue: 0,
        teamOvr: 0,
        players: [],
        matchesWon: 0,
      });
    }

    // Ensure user has enough balance
    if (user.balance < bidAmount) {
      return message.reply('Insufficient balance for this bid.');
    }

    // Make the bid
    user.balance -= bidAmount;
    user.players.push(player);
    user.teamValue += player.cardValue;
    user.teamOvr += (player.batting + player.bowling) / 2;

    await user.save();

    const embed = new EmbedBuilder()
      .setTitle(`Auction: ${player.name} was sold to ${message.author.username}`)
      .addFields(
        { name: '💸 Bid Amount', value: `${bidAmount} CG`, inline: true },
        { name: '💰 Remaining Balance', value: `${user.balance} CG`, inline: true },
        { name: '📊 Team OVR', value: `${user.teamOvr.toFixed(1)}`, inline: true },
        { name: '👥 Players Owned', value: `${user.players.length}`, inline: true },
      )
      .setColor('#FFD700');

    message.channel.send({ embeds: [embed] });
  },
};

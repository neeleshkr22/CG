const User = require('../database/userModel');
const { getAllPlayers, getRandomPlayer, findPlayerByName } = require('../database/playerModel');

const { EmbedBuilder } = require('discord.js');

// Cooldown Map (userId -> timestamp)
const auctionCooldowns = new Map();
const COOLDOWN_TIME = 60 * 1000; // 60 seconds

module.exports = {
  name: 'cmauction',
  description: 'Bid in the player auction and add them to your team!',
  async execute(message, args) {
    const playerName = args[0];
    const bidAmount = parseInt(args[1]);

    // Check cooldown
    const now = Date.now();
    const lastUsed = auctionCooldowns.get(message.author.id);

    if (lastUsed && now - lastUsed < COOLDOWN_TIME) {
      const secondsLeft = Math.ceil((COOLDOWN_TIME - (now - lastUsed)) / 1000);
      return message.reply(`🕒 Please wait **${secondsLeft} seconds** before using \`cmauction\` again.`);
    }

    // Validate input
    if (!playerName || isNaN(bidAmount) || bidAmount <= 0) {
      return message.reply('⚠️ Please use the format: `cmauction <playerName> <bidAmount>` (bid must be a number greater than 0).');
    }

    const player = await Player.findOne({ name: new RegExp(`^${playerName}$`, 'i') });
    if (!player) {
      return message.reply(`❌ Player **${playerName}** not found in the auction pool.`);
    }

    let user = await User.findOne({ userId: message.author.id });

    if (!user) {
      user = await User.create({
        userId: message.author.id,
        username: message.author.username,
        balance: 1000,
        teamValue: 0,
        teamOvr: 0,
        players: [],
        matchesWon: 0,
      });
    }

    // Check ownership
    const alreadyOwned = user.players.some(p => p.name === player.name);
    if (alreadyOwned) {
      return message.reply(`🛑 You already own **${player.name}**.`);
    }

    // Check balance
    if (user.balance < bidAmount) {
      return message.reply(`💰 You don't have enough CG! Your current balance is **${user.balance} CG**.`);
    }

    // Process auction
    user.balance -= bidAmount;
    user.players.push(player);
    user.teamValue += player.cardValue;
    user.teamOvr = user.players.reduce((sum, p) => sum + (p.batting + p.bowling) / 2, 0);

    await user.save();

    // Set cooldown
    auctionCooldowns.set(message.author.id, now);

    const embed = new EmbedBuilder()
      .setTitle(`🏏 Auction Success!`)
      .setDescription(`**${player.name}** was sold to **${message.author.username}**!`)
      .addFields(
        { name: '💸 Bid Amount', value: `${bidAmount.toLocaleString()} CG`, inline: true },
        { name: '💰 Balance Left', value: `${user.balance.toLocaleString()} CG`, inline: true },
        { name: '📈 Player Value', value: `${player.cardValue} CG`, inline: true },
        { name: '🏏 Batting', value: `${player.batting}`, inline: true },
        { name: '🎯 Bowling', value: `${player.bowling}`, inline: true },
        { name: '📊 Team OVR', value: `${user.teamOvr.toFixed(1)}`, inline: true },
        { name: '🧑‍🤝‍🧑 Players Owned', value: `${user.players.length}`, inline: true }
      )
      .setFooter({ text: 'Cricket Guru • Auction System', iconURL: message.client.user.displayAvatarURL() })
      .setColor('#00FFAA')
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};

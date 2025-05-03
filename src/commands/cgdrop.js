const Player = require('../database/playerModel');
const User = require('../database/userModel');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cmdrop',
  description: 'Drop a random player',
  async execute(message) {
    try {
      const players = await Player.find();
      if (players.length === 0) {
        return message.reply('No players available in the database.');
      }

      const randomPlayer = players[Math.floor(Math.random() * players.length)];

      let user = await User.findOne({ userId: message.author.id });
      if (!user) {
        user = await User.create({
          userId: message.author.id,
          username: message.author.username,
          balance: 1000,
          players: [],
          teamValue: 0,
          teamOvr: 0,
        });
      }

      user.players.push(randomPlayer);
      user.teamValue += randomPlayer.cardValue;
      user.teamOvr += (randomPlayer.batting + randomPlayer.bowling) / 2;
      await user.save();

      const embed = new EmbedBuilder()
        .setTitle(`🏏 You got a new player: **${randomPlayer.name}**`)
        .addFields(
          { name: 'Batting', value: `${randomPlayer.batting}`, inline: true },
          { name: 'Bowling', value: `${randomPlayer.bowling}`, inline: true },
          { name: 'Card Value', value: `${randomPlayer.cardValue} CG`, inline: true }
        )
        .setColor('#FFD700');

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[cgdrop] Error:', error);
      message.reply('An error occurred while dropping a player.');
    }
  },
};

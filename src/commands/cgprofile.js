const User = require('../database/userModel');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cmprofile',
  description: 'Show user profile',
  async execute(message) {
    try {
      let user = await User.findOne({ userId: message.author.id });

      // Auto-create user if not found
      if (!user) {
        user = await User.create({
          userId: message.author.id,
          username: message.author.username,
          balance: 1000,        // Default values
          teamValue: 0,
          teamOvr: 0,
          players: [],
          matchesWon: 0,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📜 ${message.author.username}'s Profile`)
        .addFields(
          { name: '🏦 Balance', value: `${user.balance} CG`, inline: true },
          { name: '💰 Team Value', value: `${user.teamValue} CG`, inline: true },
          { name: '📊 Team OVR', value: `${user.teamOvr.toFixed(1)}`, inline: true },
          { name: '🏆 Matches Won', value: `${user.matchesWon}`, inline: true },
          { name: '👥 Players Owned', value: `${user.players.length}`, inline: true }
        )
        .setColor('#00FF00');

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[cgprofile] Error:', error);
      message.reply('⚠️ Error fetching profile.');
    }
  },
};

// cmxi.js - View your current playing XI
// cmxi.js - View your current playing XI (fixed for JSON-style player objects)
const User = require('../database/userModel');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cmxi',
  description: 'View your playing XI',
  async execute(message) {
    try {
      const user = await User.findOne({ userId: message.author.id });

      if (!user) {
        return message.reply('❌ You haven\'t made your debut yet. Use `cmdebut` to get started.');
      }

      if (!user.players || user.players.length === 0) {
        return message.reply('⚠️ Your team is empty. Use `cmdrop` or `cmauction` to get players.');
      }

      const playerList = user.players.map((p, i) => {
        const name = p.Name || p.name || 'Unknown';
        const bat = p.BAT ?? p.batting ?? 'N/A';
        const bowl = p.BOWL ?? p.bowling ?? 'N/A';
        const value = p.Price ?? p.cardValue ?? 'N/A';
        return `**${i + 1}. ${name}** - Bat: ${bat} | Bowl: ${bowl} | Value: ${value} CG`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🏏 ${message.author.username}'s Playing XI`)
        .setDescription(playerList)
        .addFields(
          { name: 'Team OVR', value: user.teamOvr.toFixed(1), inline: true },
          { name: 'Team Value', value: `${user.teamValue} CG`, inline: true },
          { name: 'Players Owned', value: `${user.players.length}`, inline: true }
        )
        .setColor('#1E90FF')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[cmxi] Error:', err);
      return message.reply('❌ Failed to fetch your team. Try again later.');
    }
  }
};

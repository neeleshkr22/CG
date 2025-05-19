const User = require('../database/userModel');
const { EmbedBuilder } = require('discord.js');
const { getFirst11Players, formatTeamEmbed, initializePlayerData } = require('../utils/teamUtils');




module.exports = {
  name: 'xi',
  description: 'View your or another user\'s playing XI',
  async execute(message, args) {
    try {
      const targetUser = message.mentions.users.first() || message.author;
      const user = await User.findOne({ userId: targetUser.id });

      if (!user) {
        return message.reply(`❌ ${targetUser.id === message.author.id ?
          'You haven\'t made your debut yet. Use `cmdebut` to get started.' :
          'This user hasn\'t made their debut yet.'}`);
      }

      if (!user.players || user.players.length === 0) {
        return message.reply(`⚠️ ${targetUser.id === message.author.id ?
          'Your team is empty. Use `cmdrop` or `cmbuy` to get players.' : 
          'This user\'s team is empty.'}`);
      }

      const top11 = getFirst11Players(user.players);
      const embed = formatTeamEmbed(user, top11, targetUser);

      await message.channel.send({ embeds: [new EmbedBuilder(embed)] });
    } catch (err) {
      console.error('[xi] Error:', err);
      message.reply('❌ Failed to fetch team information. Try again later.');
    }
  }
};
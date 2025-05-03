const User = require('../database/userModel');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cgbal',
  description: 'Check your balance',
  async execute(message) {
    try {
      let user = await User.findOne({ userId: message.author.id });

      // If user doesn't exist, create one with default balance
      if (!user) {
        user = await User.create({
          userId: message.author.id,
          username: message.author.username,
          balance: 1000, // default starting balance
          players: [],
          teamValue: 0,
          teamOvr: 0,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`${message.author.username}'s Balance`)
        .setDescription(`💰 You have **${user.balance} CG** (Cricket Gold).`)
        .setColor('#00FF00');

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[cgbal] Error:', error);
      message.reply('An error occurred while fetching your balance.');
    }
  },
};

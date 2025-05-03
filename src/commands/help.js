// cmhelp.js - Categorized Help Command
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cmhelp',
  description: 'Lists all available commands with descriptions, grouped by category',
  execute(message) {
    const commands = message.client.commands;
    if (!commands || commands.size === 0) {
      return message.reply('⚠️ No commands available.');
    }

    // Group commands by assumed category in name or tag in help structure
    const categories = {
      Gameplay: [],
      Team: [],
      Economy: [],
      Info: []
    };

    commands.forEach(cmd => {
      const name = cmd.name.toLowerCase();
      const desc = cmd.description || 'No description';

      if (name.includes('play') || name.includes('toss') || name.includes('match')) {
        categories.Gameplay.push(`🎮 **${cmd.name}**: ${desc}`);
      } else if (name.includes('xi') || name.includes('profile') || name.includes('debut')) {
        categories.Team.push(`👥 **${cmd.name}**: ${desc}`);
      } else if (name.includes('bal') || name.includes('auction') || name.includes('drop') || name.includes('leaderboard')) {
        categories.Economy.push(`💰 **${cmd.name}**: ${desc}`);
      } else {
        categories.Info.push(`ℹ️ **${cmd.name}**: ${desc}`);
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('📘 Cricket Majnu Help Menu')
      .setDescription('Commands grouped by category:')
      .setColor('#1E90FF')
      .addFields(
        { name: '🎮 Gameplay', value: categories.Gameplay.join('\n') || 'None', inline: false },
        { name: '👥 Team Management', value: categories.Team.join('\n') || 'None', inline: false },
        { name: '💰 Economy', value: categories.Economy.join('\n') || 'None', inline: false },
        { name: 'ℹ️ Info & Misc', value: categories.Info.join('\n') || 'None', inline: false }
      )
      .setFooter({ text: 'Use commands wisely and dominate the pitch!' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

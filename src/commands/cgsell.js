
const User = require('../database/userModel');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  name: 'sell',
  description: 'Sell players by name or number range',
  async execute(message, args) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.players || user.players.length === 0) {
        return message.reply('❌ Your team is empty or you haven\'t made your debut.');
      }

      if (args.length === 0) return message.reply('⚠️ Provide a player name or number range to sell. Example: `cmsell Virat Kohli` or `cmsell 2 18`');

      let toRemove = [];
      let totalEarned = 0;

      if (!isNaN(args[0]) && !isNaN(args[1])) {
        const from = parseInt(args[0]) - 1;
        const to = parseInt(args[1]) - 1;

        if (from < 0 || to >= user.players.length || from > to)
          return message.reply('❌ Invalid range.');

        toRemove = user.players.slice(from, to + 1);
      } else {
        const name = args.join(' ').toLowerCase();
        const index = user.players.findIndex(p => (p.Name || p.name || '').toLowerCase() === name);
        if (index === -1) return message.reply('❌ Player not found in your team.');
        toRemove = [user.players[index]];
      }

      totalEarned = toRemove.reduce((sum, p) => sum + (p.Price ?? p.cardValue ?? 0), 0);
      const preview = toRemove.map(p => `• **${p.Name || p.name}** - ${p.Price ?? p.cardValue} CG`).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('⚠️ Confirm Sell')
        .setDescription(`You're about to sell:\n\n${preview}\n\n💰 **Total Earned:** ${totalEarned/2} CG`)
        .setColor('#FFA500')
        .setFooter({ text: 'Click a button below to confirm or cancel.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_sell').setLabel('✅ Confirm Sell').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_sell').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
      );

      const msg = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) {
          return i.reply({ content: '❌ Only the command author can confirm this action.', ephemeral: true });
        }

        await i.deferUpdate();
        collector.stop();

        if (i.customId === 'confirm_sell') {
          // Actually remove players
          toRemove.forEach(p => {
            const idx = user.players.findIndex(x => x._id === p._id);
            if (idx !== -1) user.players.splice(idx, 1);
          });

          user.balance += totalEarned/2;
          await user.save();

          const soldEmbed = new EmbedBuilder()
            .setTitle('✅ Players Sold')
            .setDescription(`You sold:\n${preview}\n\n💸 **Total Added to Balance:** ${totalEarned/2} CG`)
            .setColor('#32CD32');

          await msg.edit({ embeds: [soldEmbed], components: [] });
        } else {
          await msg.edit({ content: '❌ Sale cancelled.', embeds: [], components: [] });
        }
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          await msg.edit({ content: '⌛ Timed out. No action taken.', embeds: [], components: [] });
        }
      });

    } catch (err) {
      console.error('[cmsell] Error:', err);
      return message.reply('❌ Could not process the sale.');
    }
  }
};

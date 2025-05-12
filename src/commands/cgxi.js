// cmxi.js - View your current playing XI with subs, swap, and autobuild
const User = require('../database/userModel');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'cmxi',
  description: 'View your playing XI and manage subs',
  async execute(message) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user) return message.reply('❌ You haven\'t made your debut yet. Use `cmdebut` to get started.');
      if (!user.players || user.players.length === 0) return message.reply('⚠️ Your team is empty. Use `cmdrop` or `cmauction` to get players.');

      const renderXIEmbed = (players) => {
        const teamOvr = players.reduce((sum, p) => sum + ((p.OVR ?? ((p.BAT + p.BOWL) / 2)) || 0), 0) / players.length;

        const formatPlayer = (p) => {
  const name = (p.Name || p.name || 'Unknown').padEnd(16);
  const bat = p.BAT ?? p.batting ?? '??';
  const bowl = p.BOWL ?? p.bowling ?? '??';
  const ovr = p.OVR ?? Math.round((bat + bowl) / 2);
  const country = p.Country || p.country || '🌍';
  const role = (p.Role || p.role || '').toUpperCase();
  const rarity = (p.Rarity || '').toLowerCase();

  const card = rarity === 'legend' ? '🌟' : rarity === 'epic' ? '🎖️' : '🏅';
  const roleIcon = role === 'BAT' ? '🏏' : role === 'BOWL' ? '⚾' : role === 'ALR' ? '🥊' : role === 'WK' ? '🧤' : '❔';
  const bowlIcon = bowl >= 90 ? '🔥' : '<:cricball:1370820125850075356>';

  const isCaptain = name.toLowerCase().includes('dhoni') ? ' (C)' : '';

  // Final clean single-line layout
  return `\`${country}|${card}|${roleIcon}| ${name}${isCaptain} ${ovr.toString().padStart(2)}|${bat.toString().padStart(2)}|${bowl.toString().padStart(2)}\` ${bowlIcon}`;
};


        const categorize = { Batters: [], WK: [], 'All-Rounders': [], Bowlers: [] };
        for (const p of players) {
          const role = (p.Role || p.role || '').toUpperCase();
          if (role === 'WK') categorize.WK.push(p);
          else if (role === 'BAT') categorize.Batters.push(p);
          else if (role === 'BOWL') categorize.Bowlers.push(p);
          else categorize['All-Rounders'].push(p);
        }

        const roleEmojis = {
          Batters: '🏏',
          WK: '🧤',
          'All-Rounders': '🥊',
          Bowlers: '🎯'
        };

        const lines = [
  `**${user.teamName || message.author.username}** 🔸 **OVR: \`${Math.round(teamOvr)}\`**`,
  '```cntry card role player ovr bat bowl```'
];


        for (const [role, list] of Object.entries(categorize)) {
          if (list.length === 0) continue;
          lines.push(`\n__**${role.toUpperCase()} ${roleEmojis[role]}**__`);
          lines.push(...list.map(formatPlayer));
        }

        return new EmbedBuilder()
          .setDescription(lines.join('\n'))
          .setFooter({ text: `${message.author.username} • Playing XI`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setColor('#2F3136');
      };

      const xi = user.players.slice(0, 11);
      const subs = user.players.slice(11);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('subs_btn').setLabel('📋 View Subs').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('swap_btn').setLabel('🔄 Swap Players').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('autobuild_btn').setLabel('⚙️ AutoBuild').setStyle(ButtonStyle.Success)
      );

      const msg = await message.channel.send({ embeds: [renderXIEmbed(xi)], components: [row] });

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: '❌ Not your team.', ephemeral: true });

        if (i.customId === 'subs_btn') {
          if (subs.length === 0) return i.reply({ content: '❌ No substitutes in your squad.' });
          const subEmbed = new EmbedBuilder()
            .setTitle('📋 Substitutes')
            .setDescription(subs.map((p, j) => `**${j + 12}.** ${p.Name || p.name}`).join('\n'))
            .setColor('#FFA500');
          return i.reply({ embeds: [subEmbed], ephemeral: true });
        }

        if (i.customId === 'autobuild_btn') {
          const top11 = [...user.players]
            .sort((a, b) => (b.OVR ?? ((b.BAT + b.BOWL) / 2)) - (a.OVR ?? ((a.BAT + a.BOWL) / 2)))
            .slice(0, 11);
          const rest = user.players.filter(p => !top11.includes(p));
          user.players = [...top11, ...rest];
          await user.save();
          return i.reply({ embeds: [renderXIEmbed(top11)], content: '✅ AutoBuild complete! Your top players have been set as XI.' });
        }

        if (i.customId === 'swap_btn') {
          if (subs.length === 0) return i.reply({ content: '❌ You have no subs to swap.', ephemeral: true });

          const xiSelect = new StringSelectMenuBuilder()
            .setCustomId('swap_xi')
            .setPlaceholder('Select XI player to swap out')
            .setMinValues(1).setMaxValues(1)
            .addOptions(xi.map((p, idx) => ({
              label: p.Name || p.name || `XI Player ${idx + 1}`,
              value: `xi_${idx}`
            })));

          const subSelect = new StringSelectMenuBuilder()
            .setCustomId('swap_sub')
            .setPlaceholder('Select sub to swap in')
            .setMinValues(1).setMaxValues(1)
            .addOptions(subs.map((p, idx) => ({
              label: p.Name || p.name || `Sub ${idx + 1}`,
              value: `sub_${idx}`
            })));

          const swapRow1 = new ActionRowBuilder().addComponents(xiSelect);
          const swapRow2 = new ActionRowBuilder().addComponents(subSelect);

          const swapMsg = await i.reply({ content: '🔄 Choose players to swap:', components: [swapRow1, swapRow2], ephemeral: true, fetchReply: true });

          const swapCollector = swapMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30000 });
          const selections = {};

          swapCollector.on('collect', async si => {
            if (si.user.id !== message.author.id) return;

            if (si.customId === 'swap_xi') selections.xiIndex = parseInt(si.values[0].split('_')[1]);
            if (si.customId === 'swap_sub') selections.subIndex = parseInt(si.values[0].split('_')[1]);

            if (selections.xiIndex !== undefined && selections.subIndex !== undefined) {
              const xiPlayer = user.players[selections.xiIndex];
              const subPlayer = user.players[11 + selections.subIndex];

              user.players[selections.xiIndex] = subPlayer;
              user.players[11 + selections.subIndex] = xiPlayer;

              await user.save();
              await si.reply({ content: `✅ Swapped **${xiPlayer.Name || xiPlayer.name}** with **${subPlayer.Name || subPlayer.name}**.`, ephemeral: true });
              swapCollector.stop();
            }
          });
        }
      });
    } catch (err) {
      console.error('[cmxi] Error:', err);
      return message.reply('❌ Failed to fetch your team. Try again later.');
    }
  }
};
// cgbuy.js
const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const User = require('../database/userModel');
const playerData = require('../data/player.json');

module.exports = {
  name: 'cmbuy',
  description: 'Buy a player card for your team',
  async execute(message, args) {
    const query = args.join(' ').toLowerCase();
    if (!query) return message.reply('❌ Please specify a player name.');

    const matches = playerData.filter(p => (p.Name || p.name).toLowerCase().includes(query));

    if (matches.length === 0) {
      return message.reply('❌ No matching player found.');
    }

    if (matches.length === 1) {
      return await confirmPurchase(message, matches[0]);
    }

    const options = matches.slice(0, 25).map(p => ({
      label: p.Name || p.name,
      value: (p.Name || p.name) + '_' + Math.random().toString(36).substr(2, 5)
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_player')
        .setPlaceholder('Multiple matches found. Select one to buy.')
        .addOptions(options)
    );

    const sent = await message.channel.send({ content: '🔍 Select the player you want to buy:', components: [row] });
    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== message.author.id)
        return interaction.reply({ content: '❌ Not for you.', ephemeral: true });

      const label = interaction.values[0].split('_')[0];
      const selectedPlayer = playerData.find(p => (p.Name || p.name) === label);

      if (!selectedPlayer)
        return interaction.update({ content: '❌ Player not found anymore.', components: [] });

      await interaction.update({ content: `✅ You selected **${label}**.`, components: [] });
      await confirmPurchase(message, selectedPlayer);
    });
  }
};

async function confirmPurchase(message, player) {
  const playerName = player.Name || player.name;
  const playerImage = player.Card || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Cricket_ball.svg/800px-Cricket_ball.svg.png';

  const embed = new EmbedBuilder()
    .setTitle(`🛒 Buy Player: ${playerName}`)
    .setDescription(`**Do you want to buy ${playerName} for your team?**`)
    .setThumbnail(playerImage)
    .setImage(playerImage)
    .addFields(
      { name: '🏷️ Role', value: player.Role || 'Unknown', inline: true },
      { name: '🧠 Style', value: player.Style || 'N/A', inline: true },
      { name: '🎯 Trait', value: player.Trait || 'N/A', inline: true },
      { name: '🌍 Country', value: player.Country || '🌐', inline: true },
      { name: '🟡 Type', value: player.Type || 'N/A', inline: true },
      { name: '💸 Price', value: `${player.Price.toLocaleString()} CG`, inline: true },
      { name: '📊 OVR', value: `${player.OVR}`, inline: true },
      { name: '🏏 BAT', value: `${player.BAT}`, inline: true },
      { name: '🎳 BOWL', value: `${player.BOWL}`, inline: true }
    )
    .setColor('#FFD700')
    .setFooter({ text: `Card ID: ${player._id}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm_buy').setLabel('✅ Confirm Purchase').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cancel_buy').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({ embeds: [embed], components: [row] });
  const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

  collector.on('collect', async i => {
    if (i.user.id !== message.author.id)
      return i.reply({ content: '❌ You are not allowed to interact with this.', ephemeral: true });

    if (i.customId === 'cancel_buy') {
      await i.update({ content: '❌ Purchase cancelled.', components: [], embeds: [] });
    } else if (i.customId === 'confirm_buy') {
      await i.deferUpdate();
      await addPlayerToTeam(message, player);
    }
  });
}

async function addPlayerToTeam(message, player) {
  const user = await User.findOne({ userId: message.author.id });
  if (!user) return message.reply('❌ You don’t have a profile. Use `/cmdebut` first.');

  const already = user.players.some(p => (p.Name || p.name) === (player.Name || player.name));
  if (already) return message.reply('⚠️ You already own this player.');

  user.players.push(player);
  await user.save();

  const confirmEmbed = new EmbedBuilder()
    .setTitle('✅ Player Purchased')
    .setDescription(`**${player.Name || player.name}** has been added to your team.`)
    .setThumbnail(player.Card)
    .setColor('#00FF00');

  await message.channel.send({ embeds: [confirmEmbed] });
}

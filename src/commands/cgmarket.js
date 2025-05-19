// cmmarket.js - Daily player market from stitched image
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const User = require('../database/userModel');

const marketPath = path.join(__dirname, '../assets/market.json');
const marketImagePath = 'attachment://daily_market_5players.png';

module.exports = {
  name: 'market',
  description: 'View today\'s player market and buy cards',
  async execute(message) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user) return message.reply('❌ Use `cmdebut` to get started.');

      if (!fs.existsSync(marketPath)) return message.reply('❌ Market not initialized.');

      const marketPlayers = JSON.parse(fs.readFileSync(marketPath, 'utf-8'));
      if (marketPlayers.length === 0) return message.reply('❌ Market is empty today.');

      const embed = new EmbedBuilder()
        .setTitle('🛒 Daily Cricket Market')
        .setDescription('Only top-rated players (OVR > 93)\nSelect a player from the menu below to purchase.')
        .setImage(marketImagePath)
        .setColor('#FFD700')
        .setFooter({ text: `Showing ${marketPlayers.length} cards.` });

      const options = marketPlayers.map((p, i) => ({
        label: p.Name,
        description: `OVR: ${p.OVR} • Role: ${p.Role} • ${p.Price} CG`,
        value: `buy_${i}`
      }));

      const select = new StringSelectMenuBuilder()
        .setCustomId('buy_select')
        .setPlaceholder('Choose a player to buy')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(select);

      const msg = await message.channel.send({
        embeds: [embed],
        components: [row],
        files: [ { attachment: path.join(__dirname, '../assets/daily_market_5players.png'), name: 'daily_market_5players.png' } ]
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000
      });

      collector.on('collect', async i => {
        if (i.user.id !== message.author.id)
          return i.reply({ content: '❌ You are not allowed to buy from this menu.', ephemeral: true });

        const index = parseInt(i.values[0].split('_')[1]);
        const selected = marketPlayers[index];
        const price = selected.Price ?? selected.cardValue ?? 0;

        const refreshed = await User.findOne({ userId: i.user.id });
        if (refreshed.balance < price)
          return i.reply({ content: `❌ You have insufficient balance. Price: ${price} CG.`, ephemeral: true });

        refreshed.balance -= price;
        refreshed.players.push(selected);
        await refreshed.save();

        return i.reply({ content: `✅ You bought **${selected.Name}** for **${price} CG**!`, ephemeral: true });
      });

    } catch (err) {
      console.error('[cmmarket] Error:', err);
      return message.reply('❌ Could not load market.');
    }
  }
};

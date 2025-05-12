const User = require('../database/userModel');
const { getRandomPlayer } = require('../database/playerModel');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const DROP_COOLDOWN = 60 * 60 * 1000; // 1 hour

module.exports = {
  name: 'cmdrop',
  description: 'Drop a random player and decide to claim or release',
  async execute(message) {
    const user = await User.findOne({ userId: message.author.id });
    if (!user) return message.reply('❌ Use `cmdebut` to start your cricket journey.');

    const now = Date.now();
    const lastDrop = user.cooldowns?.cgdrop || 0;

    if (now - lastDrop < DROP_COOLDOWN) {
      const mins = Math.floor((DROP_COOLDOWN - (now - lastDrop)) / 60000);
      return message.reply(`⏳ Wait **${mins}m** before using \`cmdrop\` again.`);
    }

    const player = getRandomPlayer();
    if (!player) return message.reply('❌ No players found.');

    const embed = new EmbedBuilder()
      .setTitle(`🎁 Player Drop: ${player.Name}`)
      .setImage(player.Card)
      .setColor('#00CED1')
      .addFields(
        { name: '🏏 Batting', value: `${player.BAT}`, inline: true },
        { name: '🎯 Bowling', value: `${player.BOWL}`, inline: true },
        { name: '💎 OVR', value: `${player.OVR}`, inline: true },
        { name: '💰 Value', value: `${player.Price.toLocaleString()} CG`, inline: true },
        { name: '📌 Role', value: `${player.Role}`, inline: true },
        { name: '🌍 Country', value: `${player.Country}`, inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('claim').setLabel('✅ Claim').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('release').setLabel('❌ Release').setStyle(ButtonStyle.Danger)
    );

    const sent = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async interaction => {
      if (interaction.user.id !== message.author.id)
        return interaction.reply({ content: '❌ This is not your drop.', ephemeral: true });

      if (interaction.customId === 'claim') {
        user.players.push(player);
        user.teamValue += player.Price;
        user.teamOvr += player.OVR;
        user.cooldowns = { ...(user.cooldowns || {}), cgdrop: now };
        await user.save();

        await interaction.update({ content: `✅ **${player.Name}** added to your team!`, components: [], embeds: [] });
      } else {
        user.cooldowns = { ...(user.cooldowns || {}), cgdrop: now };
        await user.save();
        await interaction.update({ content: `❌ You released **${player.Name}**.`, components: [], embeds: [] });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) sent.edit({ content: '⌛ Drop expired.', components: [] });
    });
  }
};

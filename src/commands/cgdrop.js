const User = require('../database/userModel');
const { getRandomPlayer } = require('../database/playerModel');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  name: 'cmdrop',
  description: 'Drop a random player and decide to claim or release',
  async execute(message) {
    try {
      const player = getRandomPlayer();
      if (!player) return message.reply('❌ No players found.');

      const user = await User.findOne({ userId: message.author.id });
      if (!user) return message.reply('❌ You need to use `cmdebut` to start your cricket career.');

      const embed = new EmbedBuilder()
        .setTitle(`🎁 Player Drop: ${player.Name}`)
        .setDescription(`A new player has been dropped. What do you want to do?`)
        .addFields(
          { name: '🏏 Batting', value: `${player.BAT}`, inline: true },
          { name: '🎯 Bowling', value: `${player.BOWL}`, inline: true },
          { name: '💎 Overall', value: `${player.OVR}`, inline: true },
          { name: '💰 Value', value: `${player.Price.toLocaleString()} CG`, inline: true },
          { name: '🌎 Country', value: `${player.Country}`, inline: true },
          { name: '📌 Role', value: `${player.Role}`, inline: true },
          { name: '✨ Trait', value: `${player.Trait}`, inline: true },
          { name: '🎮 Style', value: `${player.Style}`, inline: true }
        )
        .setImage(player.Card)
        .setColor('#00CED1')
        .setFooter({ text: 'Click Claim to add to your team or Release to skip.' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_player').setLabel('✅ Claim').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('release_player').setLabel('❌ Release').setStyle(ButtonStyle.Danger)
      );

      const sent = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      collector.on('collect', async interaction => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply({ content: 'This drop is not for you.', ephemeral: true });
        }

        if (interaction.customId === 'claim_player') {
          user.players.push(player);
          user.teamOvr += player.OVR;
          user.teamValue += player.Price;
          await user.save();

          await interaction.update({
            content: `✅ **${player.Name}** has been added to your team!`,
            embeds: [],
            components: []
          });
        } else {
          await interaction.update({
            content: `❌ You released **${player.Name}**.`,
            embeds: [],
            components: []
          });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          sent.edit({ content: '⌛ Time expired. Player was not claimed.', components: [] });
        }
      });

    } catch (err) {
      console.error('[cmdrop] Error:', err);
      message.reply('⚠️ An error occurred while dropping a player.');
    }
  }
};

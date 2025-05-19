const User = require('../database/userModel');
const { getAllPlayers } = require('../database/playerModel');
const { EmbedBuilder } = require('discord.js');

const MONTHLY_COOLDOWN = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const MIN_OVR = 86;

function getHighOvrPlayer() {
  const eligible = getAllPlayers().filter(p => p.OVR >= MIN_OVR);
  return eligible[Math.floor(Math.random() * eligible.length)];
}

module.exports = {
  name: 'monthly',
  description: 'Claim a monthly player with guaranteed high OVR',
  async execute(message) {
    try {
      const user = await User.findOne({ userId: message.author.id });
      if (!user) return message.reply('❌ You need to use `cmdebut` to start your cricket career.');

      const now = Date.now();
      if (!user.cooldowns) user.cooldowns = {};

      const lastClaim = user.cooldowns.cmmonthly || 0;
      const timeLeft = lastClaim + MONTHLY_COOLDOWN - now;

      if (timeLeft > 0) {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return message.reply(`⏳ You can claim your next monthly reward in **${days}d ${hours}h**.`);
      }

      const player = getHighOvrPlayer();
      if (!player) return message.reply('❌ No high OVR players available.');

      user.players.push(player);
      user.teamOvr += player.OVR;
      user.teamValue += player.Price;
      // user.cooldowns.cmmonthly = now;
      user.cooldowns = {
  ...user.cooldowns, 
  cmmonthly: now     
};

      user.markModified('cooldowns'); 
      await user.save();

      const embed = new EmbedBuilder()
        .setTitle(`🌟 Monthly Superstar: ${player.Name}`)
        .setDescription('You received a high-rated player for this month!')
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
        .setColor('#800080')
        .setFooter({ text: 'Come back next month for another star!' });

      message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[cmmonthly] Error:', err);
      message.reply('⚠️ An error occurred while claiming your monthly reward.');
    }
  }
};

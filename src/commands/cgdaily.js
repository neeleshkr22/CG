const User = require('../database/userModel');
const { EmbedBuilder } = require('discord.js');

const DAILY_REWARD = 2500;
const DAILY_COOLDOWN = 12 * 60 * 60 * 1000;

module.exports = {
  name: 'cmdaily',
  description: 'Claim your daily CG',
  async execute(message) {
    const user = await User.findOne({ userId: message.author.id });
    if (!user) return message.reply('❌ Use `cmdebut` to start your cricket journey.');

    const now = Date.now();
    const lastClaim = user.cooldowns?.cgdaily || 0;

    if (now - lastClaim < DAILY_COOLDOWN) {
      const hours = Math.floor((DAILY_COOLDOWN - (now - lastClaim)) / 3600000);
      const minutes = Math.floor((DAILY_COOLDOWN - (now - lastClaim)) % 3600000 / 60000);
      return message.reply(`⏳ Wait **${hours}h ${minutes}m** before next daily.`);
    }

    user.balance += DAILY_REWARD;
    user.cooldowns = { ...(user.cooldowns || {}), cgdaily: now };
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle('💰 Daily Reward')
      .setDescription(`You've claimed **${DAILY_REWARD} CG**!`)
      .setColor('#FFD700');

    message.channel.send({ embeds: [embed] });
  }
};

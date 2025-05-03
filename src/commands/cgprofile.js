// const User = require('../database/userModel');
// const { EmbedBuilder } = require('discord.js');

// module.exports = {
//   name: 'cmprofile',
//   description: 'Show user profile',
//   async execute(message) {
//     try {
//       let user = await User.findOne({ userId: message.author.id });

//       // Auto-create user if not found
//       if (!user) {
//         user = await User.create({
//           userId: message.author.id,
//           username: message.author.username,
//           balance: 1000,        // Default values
//           teamValue: 0,
//           teamOvr: 0,
//           players: [],
//           matchesWon: 0,
//         });
//       }

//       const embed = new EmbedBuilder()
//         .setTitle(`📜 ${message.author.username}'s Profile`)
//         .addFields(
//           { name: '🏦 Balance', value: `${user.balance} CG`, inline: true },
//           { name: '💰 Team Value', value: `${user.teamValue} CG`, inline: true },
//           { name: '📊 Team OVR', value: `${user.teamOvr.toFixed(1)}`, inline: true },
//           { name: '🏆 Matches Won', value: `${user.matchesWon}`, inline: true },
//           { name: '👥 Players Owned', value: `${user.players.length}`, inline: true }
//         )
//         .setColor('#00FF00');

//       message.channel.send({ embeds: [embed] });
//     } catch (error) {
//       console.error('[cgprofile] Error:', error);
//       message.reply('⚠️ Error fetching profile.');
//     }
//   },
// };

// cmprofile.js - Enhanced User Profile with Ranks + XP/Levels
const User = require('../database/userModel');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cmprofile',
  description: 'Show your Cricket Guru profile',
  async execute(message) {
    try {
      let user = await User.findOne({ userId: message.author.id });

      if (!user) {
        user = await User.create({
          userId: message.author.id,
          username: message.author.username,
          balance: 1000,
          teamValue: 0,
          teamOvr: 0,
          players: [],
          matchesWon: 0,
          xp: 0,
          level: 1
        });
      }

      // XP and Leveling System
      const xpPerWin = 50;
      const levelUpXp = user.level * 100;
      const progress = user.xp % levelUpXp;
      const percent = Math.floor((progress / levelUpXp) * 100);

      // Rank System Based on Wins
      let rank = '🏏 Rookie';
      if (user.matchesWon >= 5) rank = '🔥 Semi-Pro';
      if (user.matchesWon >= 15) rank = '💎 Pro';
      if (user.matchesWon >= 30) rank = '👑 Legend';

      const avgPlayerOvr = user.players.length > 0
        ? (user.teamOvr / user.players.length).toFixed(1)
        : '0.0';

      const embed = new EmbedBuilder()
        .setTitle(`🏅 ${message.author.username}'s Cricket Profile`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setColor('#FFD700')
        .addFields(
          { name: '💰 Balance', value: `${user.balance.toLocaleString()} CG`, inline: true },
          { name: '📈 Team Value', value: `${user.teamValue.toLocaleString()} CG`, inline: true },
          { name: '📊 Team OVR', value: `${user.teamOvr.toFixed(1)}`, inline: true },
          { name: '📉 Avg Player OVR', value: `${avgPlayerOvr}`, inline: true },
          { name: '👥 Players Owned', value: `${user.players.length}`, inline: true },
          { name: '🏆 Matches Won', value: `${user.matchesWon}`, inline: true },
          { name: '🎖️ Rank', value: rank, inline: true },
          { name: '🧬 Level', value: `Lvl ${user.level} (${percent}% to next)`, inline: true },
          { name: '⭐ XP', value: `${user.xp} / ${levelUpXp}`, inline: true }
        )
        .setFooter({ text: 'Earn XP by winning matches to level up!' })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('[cmprofile] Error:', error);
      return message.reply('⚠️ Could not fetch your profile. Please try again.');
    }
  }
};
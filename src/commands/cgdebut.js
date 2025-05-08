// cmdebut.js - Start a cricket career with a random XI (from JSON)
const User = require('../database/userModel');
const allPlayers = require('../data/player.json'); // Make sure path is correct
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'cmdebut',
  description: 'Begin your cricket career and get your starting XI!',
  async execute(message) {
    try {
      const existingUser = await User.findOne({ userId: message.author.id });

      if (existingUser) {
        return message.reply('🛑 You have already made your debut! Use `cmprofile` to see your team.');
      }

      if (allPlayers.length < 11) {
        return message.reply('⚠️ Not enough players in the database to form a team.');
      }

      // Get 11 random players
      const shuffled = allPlayers.sort(() => 0.5 - Math.random());
      const selectedPlayers = shuffled.slice(0, 11);

      const teamOvr = selectedPlayers.reduce((sum, p) => {
        const bat = typeof p.batting === 'number' ? p.batting : 0;
        const bowl = typeof p.bowling === 'number' ? p.bowling : 0;
        return sum + (bat + bowl) / 2;
      }, 0);

      const teamValue = selectedPlayers.reduce((sum, p) => {
        const value = typeof p.cardValue === 'number' ? p.cardValue : 0;
        return sum + value;
      }, 0);

      const newUser = await User.create({
        userId: message.author.id,
        username: message.author.username,
        balance: 1000,
        players: selectedPlayers,
        teamValue,
        teamOvr,
        matchesWon: 0
      });

      const embed = new EmbedBuilder()
        .setTitle('🎉 Debut Successful!')
        .setDescription(`Welcome, **${message.author.username}**!\nYou have received your starting XI. Use \`/cmxi\` to view them or \`/cmplay\` to start a match.`)
        .addFields(
          { name: 'Team OVR', value: teamOvr.toFixed(1), inline: true },
          { name: 'Team Value', value: `${teamValue} CG`, inline: true },
          { name: 'Players', value: selectedPlayers.map(p => p.name || p.Name).join(', ') }
        )
        .setColor('#32CD32');

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[cmdebut] Error:', err);
      return message.reply('❌ An error occurred while making your debut. Please try again.');
    }
  }
};

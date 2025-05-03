const User = require('../database/userModel');

module.exports = {
  name: 'cgplay',
  description: 'Start a cricket match',
  async execute(message, args) {
    try {
      const overs = parseInt(args[0]);
      if (![5, 10, 20, 50].includes(overs)) {
        return message.reply('❌ Invalid number of overs. Choose 5, 10, 20, or 50.');
      }

      const opponent = message.mentions.users.first();
      if (!opponent) {
        return message.reply('❌ Mention an opponent to start the match.\nExample: `!cgplay 10 @opponent`');
      }

      if (opponent.id === message.author.id) {
        return message.reply('❌ You cannot play against yourself.');
      }

      // Ensure both users exist in DB
      const users = await Promise.all([
        User.findOneAndUpdate(
          { userId: message.author.id },
          { $setOnInsert: { username: message.author.username, balance: 1000, matchesWon: 0 } },
          { upsert: true, new: true }
        ),
        User.findOneAndUpdate(
          { userId: opponent.id },
          { $setOnInsert: { username: opponent.username, balance: 1000, matchesWon: 0 } },
          { upsert: true, new: true }
        )
      ]);

      const [player1, player2] = users;

      // Randomly pick winner
      const winner = Math.random() > 0.5 ? player1 : player2;
      winner.matchesWon += 1;
      winner.balance += 100;
      await winner.save();

      message.channel.send(`🏆 **${winner.username}** wins the ${overs}-over match and earns 🪙 100 CG!`);
    } catch (err) {
      console.error('[cgplay] Error:', err);
      message.reply('⚠️ An error occurred while starting the match.');
    }
  },
};

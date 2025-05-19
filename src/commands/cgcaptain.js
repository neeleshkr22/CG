const User = require('../database/userModel');

module.exports = {
  name: 'captain',
  description: 'Set your team captain by player name',
  usage: '<player name>',
  async execute(message, args) {
    if (!args.length) {
      return message.reply('Please specify a player name. Example: `!captain Virat Kohli`');
    }

    try {
      
      const user = await User.findOne({ userId: message.author.id });
      if (!user || !user.players || user.players.length === 0) {
        return message.reply("You don't have any players in your team!");
      }

      
      const searchName = args.join(' ').toLowerCase();
      const player = user.players.find(p => 
        (p.Name && p.Name.toLowerCase().includes(searchName)) ||
        (p.name && p.name.toLowerCase().includes(searchName))
      );

      if (!player) {
        return message.reply(`Player "${args.join(' ')}" not found in your team!`);
      }

      const first11Ids = user.players.slice(0, 11).map(p => p._id.toString());
      if (!first11Ids.includes(player._id.toString())) {
        return message.reply(`${player.Name} must be in your playing XI to be captain!`);
      }

      
      await User.updateOne(
        { userId: message.author.id },
        { 
          $set: { 
            captainId: player._id,
            'players.$[elem].isCaptain': false 
          }
        },
        { arrayFilters: [{ 'elem.isCaptain': true }] }
      );

      await User.updateOne(
        { userId: message.author.id, 'players._id': player._id },
        { $set: { 'players.$.isCaptain': true } }
      );

      return message.reply(`✅ ${player.Name} is now your team captain!`);

    } catch (error) {
      console.error('[CAPTAIN ERROR]', error);
      return message.reply("Failed to update captain. Please try again.");
    }
  }
};
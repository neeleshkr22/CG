const User = require('../database/userModel');

module.exports = {
  name: 'setteamname',
  description: 'Change your team name',
  usage: '<new team name>',
  cooldown: 10,
  async execute(message, args) {
    if (!args.length) {
      return message.reply('Please provide a new team name!');
    }

    const newTeamName = args.join(' ').trim();
    
    // Validate length
    if (newTeamName.length > 24) {
      return message.reply('Team name must be 24 characters or less!');
    }

    try {
      const updatedUser = await User.findOneAndUpdate(
        { userId: message.author.id },
        { $set: { teamName: newTeamName } },
        { new: true, upsert: true }
      );

      message.reply(`✅ Your team name has been updated to: **${updatedUser.teamName}**`);
    } catch (error) {
      console.error('[setteamname] Error:', error);
      message.reply('❌ Failed to update team name. Please try again later.');
    }
  }
};
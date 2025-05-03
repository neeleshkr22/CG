module.exports = {
    name: 'cmhelp',
    description: 'Lists all available commands with descriptions',
    execute(message) {
      // List of all commands and their descriptions
      const commandList = message.client.commands.map(command => {
        return `**${command.name}**: ${command.description}`;
      }).join('\n');
  
      const helpMessage = `
      **Available Commands:**
      ${commandList}
      `;
  
      message.channel.send(helpMessage);
    }
  };
  
const { EmbedBuilder } = require('discord.js');


const emojiConfig = {
  cards: {
    'Legends': '<:ChatGPT_Image_May_12202510_2:1371352467366744204>',
    'Stars': '<:ChatGPTImageMay12202510_27_58AMP:1371352822246936647>',
    'CT25': ':iccchampionstrophy2025logo01:',
    'WWC24': ':bg_f8f8f8flat_750x_075_fpad_750x:',
    'Men': '<:cmremovebgpreview:1371471724348182528>',
    'Women': '<:cmremovebgpreview:1371471724348182528>',
    'Captain': '<:ChatGPTImageMay12202505_28_05PM1:1371456917171343392>'
  },
  styles: {
    'Offspin': '<:cricball:1370820125850075356>',
    'Legspin': '<:cricball:1370820125850075356>',
    'Medium': '<:cricball:1370820125850075356>',
    'Fast': '<:cricball:1370820125850075356>'
  },
  roles: {
    'Batters': ':cricbat:',
    'Wicketkeepers': ':gloves:',
    'All-Rounders': ':cricket_game:',
    'Bowlers': '<:cricball:1370820125850075356>'
  },
  countries: {
    ':windies:': '<:westindies:1371357881533730868>'
  }
};


function getCardEmoji(player) {
  return player.isCaptain 
    ? emojiConfig.cards.Captain 
    : emojiConfig.cards[player.Type] || emojiConfig.cards.Men;
}

function getCountryEmoji(country) {
  return emojiConfig.countries[country] || country || ':earth_africa:';
}

function getStyleDisplay(style) {
  if (!style) return 'None';
  return `${emojiConfig.styles[style]}`;
}

function formatPlayerLine(player) {
  return [
    getCardEmoji(player),
    `| \`${player.Name}\``,
    `| \`${player.OVR}\``,
    `| \`${player.BAT}\``,
    `| \`${player.BOWL}\``,
    `| ${getStyleDisplay(player.Style)}`,
    `| ${getCountryEmoji(player.Country)}`
  ].join(' ');
}


function getFirst11Players(players) {
  return players.slice(0, 11);
}

function calculateTeamOvr(players) {
  if (!players.length) return 0;
  const sum = players.reduce((sum, p) => sum + (p.OVR || 0), 0);
  const avg = sum / players.length;
  return Math.floor(avg) + (avg % 1 >= 0.5 ? 1 : 0);
}

function categorizePlayers(players) {
  const categories = {
    'Batters': [],
    'Wicketkeepers': [],
    'All-Rounders': [],
    'Bowlers': []
  };

  players.forEach(player => {
    const role = (player.Role || '').toUpperCase();
    if (role === 'WK') categories.Wicketkeepers.push(player);
    else if (role === 'BAT') categories.Batters.push(player);
    else if (role === 'BOWL') categories.Bowlers.push(player);
    else categories['All-Rounders'].push(player);
  });

  return categories;
}

//
function formatTeamEmbed(user, players, author) {
  const teamOvr = calculateTeamOvr(players);
  const teamName = user.teamName || `${author.username}'s XI`;
  const categories = categorizePlayers(players);

  const embed = new EmbedBuilder()
     .setTitle(':cricket_game: Playing XI')
  .setFooter({
  text: `${author.username}'s Playing XI`,
  iconURL: author.displayAvatarURL({ dynamic: true })
})
.setColor('#1E90FF')


 let description = [
  `**\`${teamName}\`** :large_orange_diamond: **\`${teamOvr}\`**`,
  '`Card` | `Player` | `OVR` | `BAT` | `BOWL` | `Style` | `Country`'
];



  for (const [role, players] of Object.entries(categories)) {
    if (!players.length) continue;
    
    description.push(`\n__**${role}**__ ${emojiConfig.roles[role]}`);
    description.push(...players.map(formatPlayerLine));
  }

embed.setDescription(description.join('\n'));
  return embed;
}

module.exports = {
  getFirst11Players,
  formatTeamEmbed,
  calculateTeamOvr,
  categorizePlayers,
  formatPlayerLine
};
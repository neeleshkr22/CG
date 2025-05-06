// cmplay.js - Full Cricket Match with Stats, XP, Rewards
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require('discord.js');
const User = require('../database/userModel');

const pitchTypes = ['Dry', 'Dusty', 'Green'];
const weatherTypes = ['Sunny', 'Rainy', 'Foggy'];
const stadiums = ['Lords', 'MCG', 'Wankhede'];
const ballTypes = ['Inswing', 'Outswing', 'Knuckle', 'Bouncer', 'Yorker'];
const shotTypes = ['Pull', 'Scoop', 'Flick', 'Drive', 'Cut', 'Defend'];

module.exports = {
  name: 'cmplay',
  description: 'Start a full cricket match against another user',
  async execute(message, args) {
    const overs = parseInt(args[0]);
    const opponent = message.mentions.users.first();

    if (![5, 10, 20, 50].includes(overs)) return message.reply('❌ Choose 5, 10, 20, or 50 overs.');
    if (!opponent || opponent.bot || opponent.id === message.author.id) return message.reply('❌ Mention a valid opponent.');

    const [user1, user2] = await Promise.all([
      User.findOne({ userId: message.author.id }),
      User.findOne({ userId: opponent.id })
    ]);

    if (!user1 || !user2 || user1.players.length < 2 || user2.players.length < 1)
      return message.reply('❌ Both players must have at least 2 players in their team.');

    const pitch = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];
    const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    const stadium = stadiums[Math.floor(Math.random() * stadiums.length)];

    const matchEmbed = new EmbedBuilder()
      .setTitle('🏏 Match Invite')
      .setDescription(`**${message.author.username}** vs **${opponent.username}**\n${overs}-Over Match`)
      .addFields(
        { name: '🏟️ Stadium', value: stadium, inline: true },
        { name: '🌤️ Weather', value: weather, inline: true },
        { name: '🧱 Pitch', value: pitch, inline: true }
      )
      .setColor('#1D9BF0')
      .setFooter({ text: 'Waiting for opponent to accept...' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept_match').setLabel('✅ Accept Match').setStyle(ButtonStyle.Success)
    );

    const sent = await message.channel.send({ content: `${opponent}`, embeds: [matchEmbed], components: [row] });

    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async i => {
      if (i.user.id !== opponent.id)
        return i.reply({ content: '❌ This match is not for you.', ephemeral: true });

      await i.deferUpdate();
      await message.channel.send('✅ Match accepted!');
      await handleToss(message, message.author, opponent, overs);
    });
  }
};

async function handleToss(message, user1, user2, overs) {
  const tossWinner = Math.random() > 0.5 ? user1 : user2;
  const tossLoser = tossWinner.id === user1.id ? user2 : user1;

  const tossEmbed = new EmbedBuilder()
    .setTitle('🪙 Toss Result')
    .setDescription(`🎉 **${tossWinner.username}** won the toss!\nChoose to bat or bowl.`)
    .setColor('#FEE75C');

  const tossRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bat_first').setLabel('🏏 Bat First').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('bowl_first').setLabel('🎯 Bowl First').setStyle(ButtonStyle.Secondary)
  );

  const tossMsg = await message.channel.send({ content: `${tossWinner}`, embeds: [tossEmbed], components: [tossRow] });

  const tossCollector = tossMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

  tossCollector.on('collect', async i => {
    if (i.user.id !== tossWinner.id)
      return i.reply({ content: '❌ Only toss winner can decide.', ephemeral: true });

    await i.deferUpdate();

    const battingUser = i.customId === 'bat_first' ? tossWinner : tossLoser;
    const bowlingUser = i.customId === 'bat_first' ? tossLoser : tossWinner;

    await message.channel.send(`📢 **${battingUser.username}** will bat first.`);
    await setupInnings(message, battingUser, bowlingUser, overs, 'firstInnings');
  });
}

async function setupInnings(message, battingUser, bowlingUser, overs, inningsKey) {
  const battingDoc = await User.findOne({ userId: battingUser.id });
  const bowlingDoc = await User.findOne({ userId: bowlingUser.id });

  const batOptions = battingDoc.players.map(p => ({ label: p.Name || p.name, value: p.Name || p.name }));
  const bowlOptions = bowlingDoc.players.map(p => ({ label: p.Name || p.name, value: p.Name || p.name }));

  const selectOpeners = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('select_openers').setMinValues(2).setMaxValues(2).setPlaceholder('Pick 2 Openers').addOptions(batOptions)
  );

  const selectBowler = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('select_bowler').setMinValues(1).setMaxValues(1).setPlaceholder('Pick 1 Bowler').addOptions(bowlOptions)
  );

  await message.channel.send({ content: `${battingUser}, choose your 2 openers:`, components: [selectOpeners] });
  await message.channel.send({ content: `${bowlingUser}, choose your opening bowler:`, components: [selectBowler] });

  const matchState = {
    [inningsKey]: {
      score: 0,
      wickets: 0,
      balls: 0,
      overs,
      battingUser,
      bowlingUser,
      openers: [],
      bowler: '',
      runLog: []
    },
    phase: inningsKey
  };

  const collector = message.channel.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

  let ready = { openers: false, bowler: false };

  collector.on('collect', async i => {
    if (i.customId === 'select_openers' && i.user.id === battingUser.id) {
      matchState[inningsKey].openers = i.values;
      ready.openers = true;
      await i.update({ content: `✅ Openers set: ${i.values.join(', ')}`, components: [] });
    } else if (i.customId === 'select_bowler' && i.user.id === bowlingUser.id) {
      matchState[inningsKey].bowler = i.values[0];
      ready.bowler = true;
      await i.update({ content: `🎯 Bowler selected: ${i.values[0]}`, components: [] });
    }

    if (ready.openers && ready.bowler) {
      collector.stop();
      await message.channel.send(`🚨 First over begins!`);
      await startBallByBall(message, matchState, inningsKey);
    }
  });
}

async function startBallByBall(message, matchState, inningsKey) {
  const innings = matchState[inningsKey];
  const { battingUser, bowlingUser } = innings;

  // Ball type buttons (max 5 per row)
  const ballRows = [];
  for (let i = 0; i < ballTypes.length; i += 5) {
    ballRows.push(new ActionRowBuilder().addComponents(
      ballTypes.slice(i, i + 5).map(b =>
        new ButtonBuilder()
          .setCustomId(`bowl_${b.toLowerCase()}`)
          .setLabel(b)
          .setStyle(ButtonStyle.Secondary)
      )
    ));
  }

  // Shot type buttons (max 5 per row)
  const shotRows = [];
  for (let i = 0; i < shotTypes.length; i += 5) {
    shotRows.push(new ActionRowBuilder().addComponents(
      shotTypes.slice(i, i + 5).map(s =>
        new ButtonBuilder()
          .setCustomId(`shot_${s.toLowerCase()}`)
          .setLabel(s)
          .setStyle(ButtonStyle.Primary)
      )
    ));
  }

  await message.channel.send({ content: `${bowlingUser}, choose your ball:`, components: ballRows });

  const bowlCollector = message.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

  bowlCollector.on('collect', async bInt => {
    if (bInt.user.id !== bowlingUser.id) {
      return bInt.reply({ content: 'Only the bowler can bowl.', ephemeral: true });
    }

    const selectedBall = bInt.customId.split('_')[1];
    await bInt.deferUpdate();
    await message.channel.send(`🧤 Ball selected: **${selectedBall}**`);

    bowlCollector.stop();

    // ⏱️ Add delay before showing batting buttons
    setTimeout(async () => {
      await message.channel.send({ content: `${battingUser}, play your shot:`, components: shotRows });

      const shotCollector = message.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

      shotCollector.on('collect', async sInt => {
        if (sInt.user.id !== battingUser.id)
          return sInt.reply({ content: 'Only the batsman can play.', ephemeral: true });

        const shot = sInt.customId.split('_')[1];
        const outcome = Math.random();
        let result;

        if (outcome < 0.1) {
          result = '🟥 OUT';
          innings.wickets++;
        } else if (outcome < 0.3) {
          result = '⚪ Dot';
        } else if (outcome < 0.6) {
          result = ' one Run';
          innings.score += 1;
        } else if (outcome < 0.85) {
          result = '🏏 FOUR!';
          innings.score += 4;
        } else {
          result = '🎉 SIX!';
          innings.score += 6;
        }

        innings.balls++;
        innings.runLog.push(result);

        const embed = new EmbedBuilder()
          .setTitle('📊 Live Score Update')
          .setColor('#32CD32')
          .addFields(
            { name: '🏏 Score', value: `${innings.score}/${innings.wickets}`, inline: true },
            { name: '🕒 Overs', value: `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`, inline: true },
            { name: '🎯 Target', value: inningsKey === 'secondInnings' ? `${matchState.firstInnings.score + 1}` : 'N/A', inline: true },
            { name: '📈 Run Tracker', value: innings.runLog.slice(-6).join(' | ') }
          );

        await sInt.deferUpdate();
        await message.channel.send({ embeds: [embed] });

        const isEnd = innings.balls >= innings.overs * 6 || innings.wickets >= 10;
        const target = matchState.firstInnings?.score + 1;
        const chaseOver = inningsKey === 'secondInnings' && innings.score >= target;

        shotCollector.stop();

        if (isEnd || chaseOver) {
          await handleInningsEnd(message, matchState, inningsKey);
        } else {
          await startBallByBall(message, matchState, inningsKey); // next delivery
        }
      });
    }, 5000); // ⏱️ 5-second delay
  });
}


async function handleInningsEnd(message, matchState, inningsKey) {
  const innings = matchState[inningsKey];

  if (inningsKey === 'secondInnings') {
    const first = matchState.firstInnings;
    const second = matchState.secondInnings;

    let resultText;
    if (second.score > first.score) {
      resultText = `🎉 ${second.battingUser.username} wins by ${10 - second.wickets} wickets!`;
    } else if (second.score < first.score) {
      resultText = `🏆 ${first.battingUser.username} wins by ${first.score - second.score} runs!`;
    } else {
      resultText = `🤝 It's a tie! Both scored ${first.score}`;
    }

    await message.channel.send(`📢 **Match Result:** ${resultText}`);
  } else {
    const secondBat = innings.bowlingUser;
    const secondBowl = innings.battingUser;

    matchState.secondInnings = {
      score: 0,
      wickets: 0,
      balls: 0,
      overs: innings.overs,
      battingUser: secondBat,
      bowlingUser: secondBowl,
      openers: [],
      bowler: '',
      runLog: [],
      target: innings.score + 1
    };

    await setupInnings(message, secondBat, secondBowl, innings.overs, 'secondInnings');
  }
}

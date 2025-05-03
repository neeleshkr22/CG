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
      return message.reply('❌ Both players must have teams.');

    const pitch = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];
    const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
    const stadium = stadiums[Math.floor(Math.random() * stadiums.length)];

    const matchEmbed = new EmbedBuilder()
      .setTitle('🏏 Match Invite')
      .setDescription(`**${message.author.username}** vs **${opponent.username}** | ${overs}-Over Match`)
      .addFields(
        { name: '🏟️ Stadium', value: stadium, inline: true },
        { name: '🌤️ Weather', value: weather, inline: true },
        { name: '🧱 Pitch', value: pitch, inline: true }
      )
      .setColor('#00BFFF')
      .setFooter({ text: 'Waiting for opponent to accept' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept_match').setLabel('✅ Accept').setStyle(ButtonStyle.Success)
    );

    const sent = await message.channel.send({ content: `${opponent}`, embeds: [matchEmbed], components: [row] });
    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async i => {
      if (i.user.id !== opponent.id) return i.reply({ content: 'Not your match.', ephemeral: true });

      await i.deferUpdate();
      await message.channel.send('Match accepted!');
      await handleToss(message, message.author, opponent, overs);
    });
  }
};

async function handleToss(message, user1, user2, overs) {
  const tossWinner = Math.random() > 0.5 ? user1 : user2;
  const tossLoser = tossWinner.id === user1.id ? user2 : user1;

  const tossEmbed = new EmbedBuilder()
    .setTitle('🪙 Toss')
    .setDescription(`**${tossWinner.username}** won the toss! Choose to bat or bowl.`)
    .setColor('#FFD700');

  const tossRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bat_first').setLabel('🏏 Bat').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('bowl_first').setLabel('🎯 Bowl').setStyle(ButtonStyle.Secondary)
  );

  const tossMsg = await message.channel.send({ content: `${tossWinner}`, embeds: [tossEmbed], components: [tossRow] });
  const tossCollector = tossMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

  tossCollector.on('collect', async tossInt => {
    if (tossInt.user.id !== tossWinner.id) return tossInt.reply({ content: 'Only toss winner chooses.', ephemeral: true });

    const battingUser = tossInt.customId === 'bat_first' ? tossWinner : tossLoser;
    const bowlingUser = tossInt.customId === 'bat_first' ? tossLoser : tossWinner;

    await tossInt.deferUpdate();
    await message.channel.send(`🏏 ${battingUser.username} will bat first!`);
    await setupInnings(message, battingUser, bowlingUser, overs, 'firstInnings');
  });
}

async function setupInnings(message, battingUser, bowlingUser, overs, inningsKey) {
  const battingDoc = await User.findOne({ userId: battingUser.id });
  const bowlingDoc = await User.findOne({ userId: bowlingUser.id });

  const batOptions = battingDoc.players.map(p => ({ label: p.Name || p.name, value: p.Name || p.name })).slice(0, 25);
  const bowlOptions = bowlingDoc.players.map(p => ({ label: p.Name || p.name, value: p.Name || p.name })).slice(0, 25);

  const selectOpeners = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('select_openers').setMinValues(2).setMaxValues(2).setPlaceholder('Pick 2 openers').addOptions(batOptions)
  );

  const selectBowler = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('select_bowler').setMinValues(1).setMaxValues(1).setPlaceholder('Pick bowler').addOptions(bowlOptions)
  );

  await message.channel.send({ content: `${battingUser}, pick your 2 openers:`, components: [selectOpeners] });
  await message.channel.send({ content: `${bowlingUser}, pick your opening bowler:`, components: [selectBowler] });

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

  const selectCollector = message.channel.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
  let inningReady = { openers: false, bowler: false };

  selectCollector.on('collect', async sel => {
    if (sel.customId === 'select_openers' && sel.user.id === battingUser.id) {
      matchState[inningsKey].openers = sel.values;
      inningReady.openers = true;
      await sel.update({ content: `✅ Openers: ${sel.values.join(', ')}`, components: [] });
    }
    if (sel.customId === 'select_bowler' && sel.user.id === bowlingUser.id) {
      matchState[inningsKey].bowler = sel.values[0];
      inningReady.bowler = true;
      await sel.update({ content: `🎯 Bowler: ${sel.values[0]}`, components: [] });
    }

    if (inningReady.openers && inningReady.bowler) {
      selectCollector.stop();
      await message.channel.send('🚨 First over begins!');
      await startBallByBall(message, matchState, inningsKey);
    }
  });
}

async function startBallByBall(message, matchState, inningsKey) {
  const innings = matchState[inningsKey];
  const { battingUser, bowlingUser } = innings;

  const ballRows = ballTypes.map(type =>
    new ButtonBuilder().setCustomId(`bowl_${type.toLowerCase()}`).setLabel(type).setStyle(ButtonStyle.Secondary)
  );

  const shotRows = shotTypes.map(type =>
    new ButtonBuilder().setCustomId(`shot_${type.toLowerCase()}`).setLabel(type).setStyle(ButtonStyle.Primary)
  );

  await message.channel.send({ content: `${bowlingUser}, choose your ball:`, components: [new ActionRowBuilder().addComponents(ballRows)] });
  const bowlCollector = message.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });

  bowlCollector.on('collect', async i => {
    if (i.user.id !== bowlingUser.id) {
      await i.deferUpdate();
      return i.followUp({ content: 'Only the bowler can bowl.', ephemeral: true });
    }

    const selectedBall = i.customId.split('_')[1];
    await i.deferUpdate();
    await message.channel.send({ content: `🧤 Bowling: ${selectedBall}` });

    await message.channel.send({ content: `${battingUser}, play your shot:`, components: [new ActionRowBuilder().addComponents(shotRows)] });
    bowlCollector.stop();

    const shotCollector = message.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });
    shotCollector.on('collect', async i => {
      if (i.user.id !== battingUser.id) {
        await i.deferUpdate();
        return i.followUp({ content: 'Only the batsman can bat.', ephemeral: true });
      }

      const shot = i.customId.split('_')[1];
      const outcome = Math.random();
      let result;

      if (outcome < 0.1) {
        result = '🟥 OUT';
        innings.wickets++;
      } else if (outcome < 0.3) {
        result = '⚪ Dot';
      } else if (outcome < 0.6) {
        result = '➕ 1 Run';
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
        .setTitle('📊 Live Scorecard')
        .addFields(
          { name: '🏏 Score', value: `${innings.score}/${innings.wickets}`, inline: true },
          { name: '🕒 Overs', value: `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`, inline: true },
          { name: '🎯 Target', value: inningsKey === 'secondInnings' ? `${matchState.firstInnings.score + 1}` : 'N/A', inline: true },
          { name: '📈 Run Tracker', value: innings.runLog.slice(-6).join(' | '), inline: false }
        )
        .setColor('#32CD32');

      await i.deferUpdate();
      await message.channel.send({ embeds: [embed] });

      const isEnd = innings.balls >= innings.overs * 6 || innings.wickets >= 10;
      const isSecond = inningsKey === 'secondInnings';
      const target = matchState.firstInnings.score + 1;
      const chaseOver = isSecond && innings.score >= target;

      if (isEnd || chaseOver) {
        await handleInningsEnd(message, matchState, inningsKey);
      } else {
        await startBallByBall(message, matchState, inningsKey);
      }
    });
  });
}

async function handleInningsEnd(message, matchState, inningsKey) {
  const innings = matchState[inningsKey];
  const isSecond = inningsKey === 'secondInnings';

  if (isSecond) {
    const first = matchState.firstInnings;
    const second = matchState.secondInnings;

    let resultText;
    if (second.score > first.score) {
      resultText = `🎉 ${second.battingUser.username} wins by ${10 - second.wickets} wickets!`;
    } else if (second.score < first.score) {
      resultText = `🏆 ${first.battingUser.username} wins by ${first.score - second.score} runs!`;
    } else {
      resultText = `🤝 Match drawn! Both teams scored ${first.score}`;
    }

    await message.channel.send(`📢 **Match Result:** ${resultText}`);
  } else {
    const otherInningsKey = inningsKey === 'firstInnings' ? 'secondInnings' : 'firstInnings';
    const nextBattingUser = inningsKey === 'firstInnings' ? innings.bowlingUser : innings.battingUser;
    const nextBowlingUser = inningsKey === 'firstInnings' ? innings.battingUser : innings.bowlingUser;

    matchState[otherInningsKey] = {
      score: 0,
      wickets: 0,
      balls: 0,
      overs: innings.overs,
      battingUser: nextBattingUser,
      bowlingUser: nextBowlingUser,
      openers: [],
      bowler: '',
      runLog: [],
      target: innings.score + 1
    };

    await setupInnings(message, nextBattingUser, nextBowlingUser, innings.overs, otherInningsKey);
  }
}
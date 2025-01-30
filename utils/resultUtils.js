const updateCurrentStreaks = (user, opponent, userInit, opponentInit) => {
  const won = user.legs_won > opponent.legs_won;
  const userPreviousWin = userInit.previousWin === true;
  const opponentPreviousWin = opponentInit.previousWin === true;

  const getCurrentStreak = (won, previousWin, currentStreak) => {
    if (won) {
      return previousWin ? currentStreak + 1 : 1;
    }
    return 0;
  };

  return {
    user: {
      currentVictoryStreak: getCurrentStreak(
        won,
        userPreviousWin,
        userInit.currentVictoryStreak
      ),
      seasonCurrentVictoryStreak: getCurrentStreak(
        won,
        userPreviousWin,
        userInit.seasonCurrentVictoryStreak
      ),
      previousWin: won,
    },
    opponent: {
      currentVictoryStreak: getCurrentStreak(
        !won,
        opponentPreviousWin,
        opponentInit.currentVictoryStreak
      ),
      seasonCurrentVictoryStreak: getCurrentStreak(
        !won,
        opponentPreviousWin,
        opponentInit.seasonCurrentVictoryStreak
      ),
      previousWin: !won,
    },
  };
};

const updateWinsAndLevel = (
  user,
  opponent,
  userInit,
  opponentInit,
  rowSpotNo
) => {
  const won = user.legs_won > opponent.legs_won;

  let userLevel = userInit.level;
  let opponentLevel = opponentInit.level;

  if (userInit.level > opponentInit.level) {
    userLevel = won ? userInit.level : opponentInit.level;
    opponentLevel = won ? opponentInit.level : userInit.level;
  } else if (userInit.level < opponentInit.level) {
    userLevel = won ? opponentInit.level : userInit.level;
    opponentLevel = won ? userInit.level : opponentInit.level;
  } else {
    if (won) {
      userLevel = rowSpotNo < 1 ? userInit.level : userInit.level + 1;
    } else {
      opponentLevel =
        rowSpotNo < 1 ? opponentInit.level : opponentInit.level + 1;
    }
  }

  return {
    user: {
      // totalWinNo: won ? userInit.totalWinNo + 1 : userInit.totalWinNo,
      level: userLevel,
    },
    opponent: {
      // totalWinNo: won ? opponentInit.totalWinNo : opponentInit.totalWinNo + 1,
      level: opponentLevel,
    },
  };
};

const updatePyramidClimber = (
  updatedUser,
  updatedOpponent,
  userInit,
  opponentInit
) => {
  const updateClimber = (initLevel, updatedLevel, climber) => ({
    lifetime:
      initLevel < updatedLevel ? climber.lifetime + 1 : climber.lifetime,
    season: initLevel < updatedLevel ? climber.season + 1 : climber.season,
  });

  return {
    user: {
      pyramidClimber: updateClimber(
        userInit.level,
        updatedUser.level,
        userInit.pyramidClimber
      ),
    },
    opponent: {
      pyramidClimber: updateClimber(
        opponentInit.level,
        updatedOpponent.level,
        opponentInit.pyramidClimber
      ),
    },
  };
};

const updatePyramidProtector = (user, opponent, userInit, opponentInit) => {
  const won = user.legs_won > opponent.legs_won;

  const updateProtector = (initLevel, opponentLevel, protector, won) => ({
    lifetime:
      initLevel > opponentLevel && won
        ? protector.lifetime + 1
        : protector.lifetime,
    season:
      initLevel > opponentLevel && won
        ? protector.season + 1
        : protector.season,
  });

  return {
    user: {
      pyramidProtector: updateProtector(
        userInit.level,
        opponentInit.level,
        userInit.pyramidProtector,
        won
      ),
    },
    opponent: {
      pyramidProtector: updateProtector(
        opponentInit.level,
        userInit.level,
        opponentInit.pyramidProtector,
        !won
      ),
    },
  };
};

const updateLegendaryRivalry = (userInit, opponentInit) => {
  const opponentUsername = opponentInit.username?.toLowerCase();
  const userUsername = userInit.username?.toLowerCase();

  const updateRivalry = (rivalries, opponent) => {
    const existingRivalry = rivalries.find((val) => val.opponent === opponent);
    if (existingRivalry) {
      return rivalries.map((val) =>
        val.opponent === opponent
          ? { ...val, lifetime: val.lifetime + 1, season: val.season + 1 }
          : val
      );
    } else {
      return [...rivalries, { opponent, lifetime: 1, season: 1 }];
    }
  };

  return {
    user: {
      legendaryRivalry: updateRivalry(
        userInit.legendaryRivalry,
        opponentUsername
      ),
    },
    opponent: {
      legendaryRivalry: updateRivalry(
        opponentInit.legendaryRivalry,
        userUsername
      ),
    },
  };
};

const updateMaster180 = (user, opponent, userInit, opponentInit) => {
  return {
    user: {
      master180: {
        lifetime: userInit.master180.lifetime + user.p180,
        season: userInit.master180.season + user.p180,
      },
    },
    opponent: {
      master180: {
        lifetime: opponentInit.master180.lifetime + opponent.p180,
        season: opponentInit.master180.season + opponent.p180,
      },
    },
  };
};

const updateGrandMaster = (user, opponent, userInit, opponentInit) => {
  const calculateAverage = (scoreHistory) => {
    const legs = scoreHistory
      .filter((val) => val.scores.length > 0)
      .map(
        (val) =>
          val.scores.reduce((acc, sub) => acc + sub, 0) / val.scores.length
      );
    const matchAvg = legs.reduce((acc, sub) => acc + sub, 0) / legs.length;
    return { legs, matchAvg };
  };

  const userStats = calculateAverage(user.scoreHistory);
  const opponentStats = calculateAverage(opponent.scoreHistory);

  const updateGrandMasterStats = (initStats, newStats) => ({
    lifetime: {
      leg: Math.max(initStats?.lifetime?.leg || 0, ...newStats.legs),
      match: Math.max(initStats?.lifetime?.match || 0, newStats.matchAvg),
    },
    season: {
      leg: Math.max(initStats?.season?.leg || 0, ...newStats.legs),
      match: Math.max(initStats?.season?.match || 0, newStats.matchAvg),
    },
  });

  return {
    user: {
      grandMaster: updateGrandMasterStats(userInit.grandMaster, userStats),
    },
    opponent: {
      grandMaster: updateGrandMasterStats(
        opponentInit.grandMaster,
        opponentStats
      ),
    },
  };
};

const updateMaxMarksman = (user, opponent) => {
  return {
    user: {
      maxMarksman: user.p171 > 0,
    },
    opponent: {
      maxMarksman: opponent.p171 > 0,
    },
  };
};

const updateDartEnthusiast = (userInit) => {
  return {
    dartEnthusiast: {
      lifetime: Number(userInit.dartEnthusiast.lifetime) + 1,
      season: Number(userInit.dartEnthusiast.season) + 1,
    },
  };
};

const calcDoubles = (player) => {
  if (!player) return 0;
  let darts_thrown_double = 0, finish_thrown = 0;
  player.scoreHistory.forEach((item) => {
    let legDoubleSum = item.doubleMissed.reduce((acc, sub) => acc + sub, 0);
    darts_thrown_double += legDoubleSum;
    if (item.hasOwnProperty("to_finish")) {
      finish_thrown += item.to_finish;
      darts_thrown_double += item.to_finish;
    }
  });
  const doubles =
    darts_thrown_double && finish_thrown
      ? ((finish_thrown / (darts_thrown_double)) * 10000) /
        100
      : 0;
  return doubles;
};

const updateIronDart = (user, opponent, matchResult) => {
  const won = user.legs_won > opponent.legs_won;
  const doubles = calcDoubles(user);

  return {
    ironDart: {
      lifetime: won
        ? matchResult.ironDart.lifetime < doubles
          ? doubles
          : matchResult.ironDart.lifetime
        : matchResult.ironDart.lifetime,
      season: won
        ? matchResult.ironDart.season < doubles
          ? doubles
          : matchResult.ironDart.season
        : matchResult.ironDart.season,
    },
  };
};

const updateMaxStreaks = (
  updateUser,
  updateOpponent,
  userInit,
  opponentInit
) => {
  const updateStreak = (init, update) => ({
    maxVictoryStreak:
      update.currentVictoryStreak > init.maxVictoryStreak
        ? update.currentVictoryStreak
        : init.maxVictoryStreak,
    seasonMaxVictoryStreak:
      update.seasonCurrentVictoryStreak > init.seasonMaxVictoryStreak
        ? update.seasonCurrentVictoryStreak
        : init.seasonMaxVictoryStreak,
  });

  return {
    user: updateStreak(userInit, updateUser),
    opponent: updateStreak(opponentInit, updateOpponent),
  };
};

const updateFriendlyChallenger = (userInit) => {
  return {
    friendlyChallenger: {
      lifetime: Number(userInit.friendlyChallenger.lifetime) + 1,
      season: Number(userInit.friendlyChallenger.season) + 1,
    },
  };
};

const updateMonthlyMaestro = (userInit, userUpdate) => {
  return {
    monthlyMaestro: {
      lifetime:
        userUpdate.level === 6
          ? userInit.monthlyMaestro.lifetime + 1
          : userInit.monthlyMaestro.lifetime,
      season:
        userUpdate.level === 6
          ? userInit.monthlyMaestro.season + 1
          : userInit.monthlyMaestro.season,
    },
  };
};

const updateChampionChallenger = (opponentInit) => {
  return {
    championChallenger: opponentInit.level === 6 ? true : false,
  };
};

const updateReadyForIt = (userInit) => {
  return {
    readyForIt: {
      lifetime: Number(userInit.readyForIt.lifetime) + 1,
      season: Number(userInit.readyForIt.season) + 1,
    },
  };
};

const updateChallengeConqueror = (user, opponent, opponentInit) => {
  return {
    challengeConqueror: {
      lifetime:
        user.legs_won < opponent.legs_won
          ? Number(opponentInit.challengeConqueror.lifetime) + 1
          : opponentInit.challengeConqueror.lifetime,
      season:
        user.legs_won < opponent.legs_won
          ? Number(opponentInit.challengeConqueror.season) + 1
          : opponentInit.challengeConqueror.season,
    },
  };
};

const updateSummary = (date, user, userUpdate, userInit) => {
  const calculateAverage = (scoreHistory) => {
    const legs = scoreHistory
      .filter((val) => val.scores.length > 0)
      .map(
        (val) =>
          val.scores.reduce((acc, sub) => acc + sub, 0) / val.scores.length
      );
    const matchAvg = legs.reduce((acc, sub) => acc + sub, 0) / legs.length;
    return { legs, matchAvg };
  };

  return {
    summary: userInit.summary.concat({
      //   doubles:
      //     user?.name?.toLowerCase() === matchResult.p1_name?.toLowerCase()
      //       ? matchResult?.p1_doubles
      //       : matchResult?.p2_doubles,
      master180: user.p180,
      //   first9Avg:
      //     user?.name?.toLowerCase() === matchResult.p1_name?.toLowerCase()
      //       ? matchResult?.p1_first9_avg
      //       : matchResult?.p2_first9_avg,
      matchAvg: calculateAverage(user.scoreHistory).matchAvg,
      level: userUpdate.level,
      date: new Date(date),
    }),
  };
};

const updateConsistentScorer = (user, userInit) => {
  let cnt = 0;
  user.scoreHistory.forEach((val) => {
    if (val.scores.length > 0) {
      val.scores.forEach((score) => {
        if (score >= 100) {
          cnt++;
        }
      });
    }
  });

  return {
    consistentScorer: {
      lifetime: userInit.consistentScorer.lifetime + cnt,
      season: userInit.consistentScorer.season + cnt,
    },
  };
};

const updateMaster26 = (user, userInit) => {
  return {
    master26: {
      lifetime: userInit.master26.lifetime + user.p26,
      season: userInit.master26.season + user.p26,
    },
  };
};

const updateThrowCount = (user, userInit) => {
  return {
    throwCount: {
      lifetime: userInit.throwCount.lifetime + user.darts_thrown,
      season: userInit.throwCount.season + user.darts_thrown,
    },
  };
};

const getHighMarks = () => {
  const highMarks = [170, 167, 164, 161, 160, 158];
  for (let i = 157; i > 100; i--) {
    highMarks.push(i);
  }
  return highMarks;
};

const updateHighFinish = (user, userInit) => {
  const highMarks = getHighMarks();
  let highFinish = userInit.highFinish;

  user?.scoreHistory.forEach((val) => {
    if (val.hasOwnProperty("to_finish")) {
      const high = highMarks.findIndex(
        (mark) => mark === val.scores[val.scores.length - 1]
      );
      if (high >= 0) {
        highFinish = userInit.highFinish.map((item, index) =>
          index === high ? 1 : item
        );
      }
    }
  });

  return {
    highFinish,
  };
};

module.exports = {
  updateCurrentStreaks,
  updateWinsAndLevel,
  updatePyramidClimber,
  updatePyramidProtector,
  updateLegendaryRivalry,
  updateMaster180,
  updateGrandMaster,
  updateMaxMarksman,
  updateDartEnthusiast,
  updateMaxStreaks,
  updateFriendlyChallenger,
  updateMonthlyMaestro,
  updateChampionChallenger,
  updateReadyForIt,
  updateChallengeConqueror,
  updateIronDart,
  updateSummary,
  updateConsistentScorer,
  updateMaster26,
  updateThrowCount,
  updateHighFinish,
};

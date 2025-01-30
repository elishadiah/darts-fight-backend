const getMilestones = (achievemenName) => {
  const milestonesMap = {
    pyramidClimber: [1, 3, 5, 10, 15],
    challengeConqueror: [1, 3, 5, 10, 15],
    maxVictoryStreak: [1, 2, 3, 4, 5],
    seasonMaxVictoryStreak: [1, 2, 3, 4, 5],
    monthlyMaestro: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    pyramidProtector: [1, 3, 5, 10, 15],
    legendaryRivalry: [2, 3, 4, 5, 6],
    ironDart: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    master180: [1, 3, 5, 10, 20, 100],
    consistentScorer: [3, 5, 10, 20, 50],
    breakfast: [10, 30, 50, 100, 200, 300, 400, 500, 750, 1000],
    dartEnthusiast: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    friendlyChallenger: [1, 5, 10, 20, 50],
    readyForIt: [1, 3, 5, 10, 20],
  };

  for (let key in milestonesMap) {
    if (achievemenName.includes(key)) {
      return milestonesMap[key];
    }
  }

  return [];
};

function checkMilestones(achievementName, achievement, milestones) {
  const newAchievements = [];
  for (let i = 0; i < milestones.length; i++) {
    let milestone = milestones[i];
    if (achievement.new >= milestone && achievement.old < milestone) {
      newAchievements.push({
        name: achievementName,
        value: milestone,
        index: i,
      });
    }
  }
  return newAchievements;
}

function handleNewAchievementCheck(achievementName, achievement) {
  const milestones = getMilestones(achievementName);

  if (achievement.hasOwnProperty("new") && achievement.hasOwnProperty("old")) {
    return checkMilestones(achievementName, achievement, milestones);
  } else {
    const newAchievements = [];
    for (let key in achievement) {
      if (achievement.hasOwnProperty(key)) {
        let nestedAchievement = achievement[key];
        if (
          (nestedAchievement.new !== undefined &&
            nestedAchievement.old !== undefined) ||
          (nestedAchievement.hasOwnProperty("lifetime") &&
            nestedAchievement.hasOwnProperty("season"))
        ) {
          newAchievements.push(
            ...handleNewAchievementCheck(
              achievementName + "." + key,
              nestedAchievement
            )
          );
        }
      }
    }
    return newAchievements;
  }
}

function findModifiedProperties(obj1, obj2) {
  const modifiedProperties = {};
  const skipArr = [
    "date",
    "_id",
    "createdAt",
    "updatedAt",
    "__v",
    "summary",
    "highFinish",
  ];

  const arr = obj1.hasOwnProperty("_doc") ? obj1._doc : obj1;

  for (let key in arr) {
    if (skipArr.includes(key) || obj2[key] === undefined) continue;
    if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
      const nestedModifiedProperties = findModifiedProperties(
        obj1[key],
        obj2[key]
      );
      if (Object.keys(nestedModifiedProperties).length > 0) {
        modifiedProperties[key] = nestedModifiedProperties;
      }
    } else if (obj1[key] !== obj2[key]) {
      modifiedProperties[key] = {
        new: obj1[key],
        old: obj2[key],
      };
    }
  }

  return modifiedProperties;
}

const getHighMarks = () => {
  const highMarks = [170, 167, 164, 161, 160, 158];
  for (let i = 157; i > 100; i--) {
    highMarks.push(i);
  }
  return highMarks;
};

const handleAchievement = (updated, origin, scoreHistory) => {
  const achievementData = findModifiedProperties(updated, origin);
  let newAchievements = [];
  for (var achievementName in achievementData) {
    if (achievementData.hasOwnProperty(achievementName)) {
      var achievement = achievementData[achievementName];
      newAchievements.push(
        ...handleNewAchievementCheck(achievementName, achievement)
      );
    }
  }
  // Check for high finish
  if (scoreHistory?.length > 0) {
    scoreHistory.forEach((item) => {
      if (item.hasOwnProperty("to_finish")) {
        const high = getHighMarks().findIndex(
          (mark) => mark === item.scores[item.scores.length - 1]
        );

        if (high !== -1) {
          newAchievements.push({
            index: high,
            name: "finishingAce",
            value: item.scores[item.scores.length - 1],
          });
        }
      }
    });
  }
  return newAchievements;
};

module.exports = {
  handleAchievement,
  getMilestones,
  findModifiedProperties,
  checkMilestones,
  handleNewAchievementCheck,
};

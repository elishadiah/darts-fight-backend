const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateRandomToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const generateAvatars = () => {
  const avatars = [];
  const levels = 6;
  const avatarsPerLevel = 7;
  const baseXP = 100;
  const baseXPIncrement = 300;
  const levelMultiplier = 3;
  const baseScoring = 10;
  const lvlScoringIncrement = 4;
  const scoringIncrement = 1;
  const baseCheckout = 0.1;
  const lvlCheckoutIncrement = 0.1;
  const checkoutIncrement = 0.05;
  const baseEdge = 0;
  const lvlEdgeIncrement = 0.1;
  const edgeIncrement = 0.05;
  const baseBullseye = 0.1;
  const lvlBullseyeIncrement = 0.1;
  const bullseyeIncrement = 0.05;
  const excludedScoringValues = [179, 178, 176, 175, 173, 172, 169];

  for (let level = 1; level <= levels; level++) {
    const levelXPIncrement = Math.pow(level, levelMultiplier) * baseXPIncrement;
    const levelScoringBase =
      baseScoring + Math.pow(level, 2) * lvlScoringIncrement; // Non-linear increase

    for (let i = 1; i <= avatarsPerLevel; i++) {
      const subLevelXP =
        baseXP + (level - 1) * levelXPIncrement + (i - 1) * baseXPIncrement;
      let subLevelScoringIncrement =
        levelScoringBase + (i - 1) * scoringIncrement; // Linear increase

      while (excludedScoringValues.includes(subLevelScoringIncrement)) {
        subLevelScoringIncrement++;
      }

      // Ensure no overlap between levels
      if (level > 1) {
        const prevLevelMaxScoring =
          baseScoring +
          Math.pow(level - 1, 2) * lvlScoringIncrement +
          (avatarsPerLevel - 1) * scoringIncrement;
        if (subLevelScoringIncrement <= prevLevelMaxScoring) {
          subLevelScoringIncrement = prevLevelMaxScoring + 1;
        }
      }

      avatars.push({
        title: `Virtual Avatar ${level}-${i}`,
        ranks: level,
        subLvl: i,
        xp: subLevelXP,
        imgName: `RANKAVATAR${level}_${i}`,
        isLocked: false,
        isSelected: false,
        skillset: [
          {
            name: "XP Boost",
            value: (level - 1) * 8 + i,
            description: "xpBoostDescription",
            color: "bg-green-500",
          },
          {
            name: "Bullseye",
            value:
              baseBullseye +
              (level - 1) * 8 * lvlBullseyeIncrement +
              (i - 1) * bullseyeIncrement,
            initValue:
              baseBullseye +
              (level - 1) * 8 * lvlBullseyeIncrement +
              (i - 1) * bullseyeIncrement,
            requiredXp: 75,
            description: "bullseyeDescription",
            color: "bg-red-500",
          },
          {
            name: "Scoring",
            value: subLevelScoringIncrement,
            initValue: subLevelScoringIncrement,
            requiredXp: 75,
            description: "scoringDescription",
            color: "bg-blue-500",
          },
          {
            name: "Checkout",
            value:
              baseCheckout +
              (level - 1) * 8 * lvlCheckoutIncrement +
              (i - 1) * checkoutIncrement,
            initValue:
              baseCheckout +
              (level - 1) * 8 * lvlCheckoutIncrement +
              (i - 1) * checkoutIncrement,
            requiredXp: 75,
            description: "checkoutDescription",
            color: "bg-yellow-500",
          },
          {
            name: "Edge",
            value:
              baseEdge +
              (level - 1) * 8 * lvlEdgeIncrement +
              (i - 1) * edgeIncrement,
            initValue:
              baseEdge +
              (level - 1) * 8 * lvlEdgeIncrement +
              (i - 1) * edgeIncrement,
            requiredXp: 75,
            description: "edgeDescription",
            color: "bg-purple-500",
          },
        ],
      });
    }
  }

  return avatars;
};

const generateRankThresholds = () => {
  const arr = [];
  const initialValue = 500;
  const increment = 1000;
  const length = 42;

  for (let i = 0; i < length; i++) {
    arr.push(initialValue + i * increment);
  }

  return arr;
};

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  generateRandomToken,
  generateAvatars,
  generateRankThresholds,
};

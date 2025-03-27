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
  const baseXP = 500;
  const xpIncrement = 1000;
  const baseScoring = 10;
  const lvlScoringIncrement = 3;
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

  for (let level = 1; level <= levels; level++) {
    for (let i = 1; i <= avatarsPerLevel; i++) {
      avatars.push({
        title: `Virtual Avatar ${level}-${i}`,
        ranks: level,
        subLvl: i,
        xp: baseXP + (level - 1) * 8 * xpIncrement + (i - 1) * xpIncrement,
        img: `RANKAVATAR${level}_${i}`,
        scoring:
          baseScoring +
          (level - 1) * 8 * lvlScoringIncrement +
          (i - 1) * scoringIncrement,
        checkout:
          baseCheckout +
          (level - 1) * 8 * lvlCheckoutIncrement +
          (i - 1) * checkoutIncrement,
        edge:
          baseEdge +
          (level - 1) * 8 * lvlEdgeIncrement +
          (i - 1) * edgeIncrement,
        bullseye:
          baseBullseye +
          (level - 1) * 8 * lvlBullseyeIncrement +
          (i - 1) * bullseyeIncrement,
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

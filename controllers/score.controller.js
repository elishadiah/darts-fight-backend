const ScoreModel = require("../models/score.model.js");
const ResultModel = require("../models/result.model.js");
const UserModel = require("../models/user.model.js");
const mongoose = require("mongoose");

const scoreCategories = [
  { threshold: 180, field: "p180" },
  { threshold: 171, field: "p171" },
  { threshold: 160, field: "p160" },
  { threshold: 140, field: "p140" },
  { threshold: 100, field: "p100" },
  { threshold: 80, field: "p80" },
  { threshold: 60, field: "p60" },
  { threshold: 40, field: "p40" },
  { threshold: 26, field: "p26" },
  { threshold: 20, field: "p20" },
  { threshold: 0, field: "p0" },
];

const getScores = async (req, res) => {
  try {
    const scores = await ScoreModel.find();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOpenGamesApi = async (req, res) => {
  try {
    const openGames = await ScoreModel.find({ isFinished: false });
    res.json(openGames);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyOpenGamesApi = async (req, res) => {
  try {
    const { username } = req.params;
    const openGames = await ScoreModel.find({
      isFinished: false,
      $or: [{ "p1.name": username }, { "p2.name": username }],
    });
    res.json(openGames);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMatch = async (challenger, opponent, token) => {
  try {
    const [player1Result, player2Result] = await Promise.all([
      ResultModel.findOne({ username: challenger }),
      ResultModel.findOne({ username: opponent }),
    ]);

    await ScoreModel.create({
      token,
      p1: {
        name: challenger,
        currentScore: 501,
        scoreHistory: [],
        p0: 0,
        p20: 0,
        p26: 0,
        p40: 0,
        p60: 0,
        p80: 0,
        p100: 0,
        p140: 0,
        p160: 0,
        p180: 0,
        darts_thrown_double: 0,
        darts_missed_double: 0,
        legs: 0,
        legs_won: 0,
        match_avg: 0,
        bull: {
          score: 0,
          isClosed: false,
          isWaiting: false,
        },
        initialResult: { ...player1Result },
      },
      p2: {
        name: opponent,
        currentScore: 501,
        scoreHistory: [],
        p0: 0,
        p20: 0,
        p26: 0,
        p40: 0,
        p60: 0,
        p80: 0,
        p100: 0,
        p140: 0,
        p160: 0,
        p180: 0,
        darts_thrown_double: 0,
        darts_missed_double: 0,
        legs: 0,
        legs_won: 0,
        match_avg: 0,
        bull: {
          score: 0,
          isClosed: false,
          isWaiting: true,
        },
        initialResult: { ...player2Result },
      },
    });
  } catch (err) {
    console.log("create-match-err->", err);
  }
};

const getPlayerAndOpponent = (user, match) => {
  if (user === match.p1.name) {
    return { player: match.p1, opponent: match.p2 };
  } else if (user === match.p2.name) {
    return { player: match.p2, opponent: match.p1 };
  } else {
    throw new Error("Invalid user");
  }
};

const updateMatchScore = async (
  token,
  score,
  missed,
  thrown,
  toFinish,
  user
) => {
  try {
    const match = await ScoreModel.findOne({ token });

    if (!match) {
      throw new Error("Match not found");
    }

    if (user === match.p1.name && !match.p1.bull.isClosed) {
      throw new Error("Bull not closed");
    } else if (user === match.p2.name && !match.p2.bull.isClosed) {
      throw new Error("Bull not closed");
    }

    const { player, opponent } = getPlayerAndOpponent(user, match);

    player.currentScore -= score;

    if (!player.scoreHistory[match.legNo - 1]) {
      player.scoreHistory[match.legNo - 1] = { scores: [], doubleMissed: [] };
    }
    let history = player.scoreHistory[match.legNo - 1].scores;
    let doubleMissed = player.scoreHistory[match.legNo - 1].doubleMissed;
    history.push(score);
    doubleMissed.push(missed);
    player.scoreHistory[match.legNo - 1].scores = history;
    player.scoreHistory[match.legNo - 1].doubleMissed = doubleMissed;
    player.darts_thrown = (player.darts_thrown || 0) + thrown;

    for (const { threshold, field } of scoreCategories) {
      if (score >= threshold) {
        player[field] = (player[field] || 0) + 1;
        break;
      }
    }

    match.challengerTurn = user !== match.p1.name;

    if (player.currentScore === 0) {
      player.currentScore = 501;
      player.legs_won = (player.legs_won || 0) + 1;
      opponent.currentScore = 501;
      player.scoreHistory[match.legNo - 1] = {
        ...player.scoreHistory[match.legNo - 1],
        to_finish: toFinish,
        scores: player.scoreHistory[match.legNo - 1].scores,
        doubleMissed: player.scoreHistory[match.legNo - 1].doubleMissed,
      };
      match.legNo = match.legNo + 1;

      const p1BullScore = match.p1.bull.score;
      const p2BullScore = match.p2.bull.score;

      const legTurnOrder = [true, false, true, false, true];
      match.challengerTurn =
        p1BullScore > p2BullScore
          ? legTurnOrder[match.legNo - 1]
          : !legTurnOrder[match.legNo - 1];
    }

    const updateMatch = await match.save();

    return updateMatch;
  } catch (err) {
    console.log("update-match-err->", err);
    throw err;
  }
};

const getMatchStatus = async (req, res) => {
  try {
    const { token } = req.params;
    const match = await ScoreModel.findOne({ token });
    res.json(match);
  } catch (err) {
    console.log("get-match-status-->>", err);
  }
};

const updateMatchFinish = async (token) => {
  try {
    const match = await ScoreModel.findOne({ token });

    if (!match) {
      throw new Error("Match not found");
    }

    match.isFinished = true;

    const updatedMath = await match.save();
    return updatedMath;
  } catch (err) {
    console.log("match-finish-err-->>>", err);
  }
};

const updateBullScore = async (token, score, username) => {
  try {
    const match = await ScoreModel.findOne({ token });

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.p1.name === username) {
      match.p1.bull.score = score;
      match.p1.bull.isWaiting = true;
      match.p2.bull.isWaiting = false;
    } else if (match.p2.name === username) {
      match.p2.bull.score = score;
      match.p2.bull.isWaiting = false;
      match.p2.bull.isClosed = true;
      match.p1.bull.isWaiting = false;
      match.p1.bull.isClosed = true;

      const p1BullScore = match.p1.bull.score;
      const p2BullScore = match.p2.bull.score;

      match.challengerTurn = p1BullScore > p2BullScore;
    }

    const updateMatch = await match.save();

    return updateMatch;
  } catch (err) {
    console.log("update-bull-score-err->", err);
    throw err;
  }
};

const updateBullScoreApi = async (req, res) => {
  try {
    const { token, score, username } = req.body;
    const match = await ScoreModel.findOne({ token });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (match.p1.name === username) {
      match.p1.bull.score = score;
      match.p1.bull.isClosed = true;
    } else if (match.p2.name === username) {
      match.p2.bull.score = score;
      match.p2.bull.isClosed = true;
    }

    const p1BullScore = match.p1.bull.score;
    const p2BullScore = match.p2.bull.score;

    match.challengerTurn = p1BullScore > p2BullScore;

    const updateMatch = await match.save();

    res.json(updateMatch);
  } catch (err) {
    console.log("update-bull-score-err->", err);
    res.status(500).json({ message: err.message });
    throw err;
  }
};

const undoLastScore = async (token, user, score, missed, toFinish, bust) => {
  try {
    const match = await ScoreModel.findOne({ token });

    if (!match) {
      throw new Error("Match not found");
    }

    const { player, opponent } = getPlayerAndOpponent(user, match);

    if (!player) {
      throw new Error("Invalid user");
    }

    const lastScoreIndex =
      player.scoreHistory[match.legNo - 1].scores.length - 1;
    const originLastScore =
      player.scoreHistory[match.legNo - 1].scores[lastScoreIndex];

    if (originLastScore === 0) {
      player.darts_thrown =
        player.darts_thrown - (player.darts_thrown % 3) + bust;
    } else {
      player.darts_thrown = player.darts_thrown - 3 + bust;
    }

    for (const { threshold, field } of scoreCategories) {
      if (originLastScore >= threshold && player[field] > 0) {
        player[field] -= 1;
        break;
      }
    }
    player.scoreHistory[match.legNo - 1].scores[lastScoreIndex] = score;
    player.scoreHistory[match.legNo - 1].doubleMissed[lastScoreIndex] = missed;
    player.currentScore = player.currentScore + originLastScore - score;

    if (player.currentScore === 0) {
      player.currentScore = 501;
      player.legs_won = (player.legs_won || 0) + 1;
      opponent.currentScore = 501;
      player.scoreHistory[match.legNo - 1] = {
        ...player.scoreHistory[match.legNo - 1],
        to_finish: toFinish,
        scores: player.scoreHistory[match.legNo - 1].scores,
        doubleMissed: player.scoreHistory[match.legNo - 1].doubleMissed,
      };
      match.legNo = match.legNo + 1;

      const p1BullScore = match.p1.bull.score;
      const p2BullScore = match.p2.bull.score;

      const legTurnOrder = [true, false, true, false, true];
      match.challengerTurn =
        p1BullScore > p2BullScore
          ? legTurnOrder[match.legNo - 1]
          : !legTurnOrder[match.legNo - 1];
    }

    const updateMatch = await match.save();

    return updateMatch;
  } catch (err) {
    console.log("undo-last-score-err->", err);
    throw err;
  }
};

module.exports = {
  getScores,
  createMatch,
  getMatchStatus,
  updateMatchScore,
  updateMatchFinish,
  updateBullScore,
  updateBullScoreApi,
  getOpenGamesApi,
  getMyOpenGamesApi,
  undoLastScore,
};

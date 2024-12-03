const ScoreModel = require("../models/score.model.js");

const getScores = async (req, res) => {
  try {
    const scores = await ScoreModel.find();
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createMatch = async (challenger, opponent, token) => {
  try {
    const newMatch = new ScoreModel({
      challenger,
      challengerScore: 501,
      challengerScoreHistory: [],
      opponent,
      opponentScore: 501,
      opponentScoreHistory: [],
      token,
    });

    await newMatch.save();
  } catch (err) {
    console.log("create-match-err->", err);
  }
};

const updateMatchScore = async (token, score, user) => {
  try {
    const match = await ScoreModel.findOne({ token });

    if (!match) {
      throw new Error("Match not found");
    }

    if (user === match.challenger) {
      match.challengerScore = match.challengerScore - score;
      if (!match.challengerScoreHistory[match.legNo - 1]) {
        match.challengerScoreHistory[match.legNo - 1] = [];
      }
      let history = match.challengerScoreHistory[match.legNo - 1];
      history.push(score);
      match.challengerScoreHistory[match.legNo - 1] = history;
      match.challengerTurn = false;
    } else {
      match.opponentScore = match.opponentScore - score;
      if (!match.opponentScoreHistory[match.legNo - 1]) {
        match.opponentScoreHistory[match.legNo - 1] = [];
      }
      let history = match.opponentScoreHistory[match.legNo - 1];
      history.push(score);
      match.opponentScoreHistory[match.legNo - 1] = history;
      match.challengerTurn = true;
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

module.exports = { getScores, createMatch, getMatchStatus, updateMatchScore };

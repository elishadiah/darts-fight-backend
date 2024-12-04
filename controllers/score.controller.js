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
      let currentScore = match.challengerScore;

      if (currentScore - score > 0) {
        match.challengerScore = currentScore - score;
        if (!match.challengerScoreHistory[match.legNo - 1]) {
          match.challengerScoreHistory[match.legNo - 1] = [];
        }
        let history = match.challengerScoreHistory[match.legNo - 1];
        history.push(score);
        match.challengerScoreHistory[match.legNo - 1] = history;
      } else if (currentScore - score === 0) {
        match.challengerScore = 501;
        match.challengerWins = match.challengerWins + 1;
        match.legNo = match.legNo + 1;
        match.opponentScore = 501;
      }

      match.challengerTurn = false;
    } else {
      let currentScore = match.opponentScore;

      if (currentScore - score > 0) {
        match.opponentScore = currentScore - score;
        if (!match.opponentScoreHistory[match.legNo - 1]) {
          match.opponentScoreHistory[match.legNo - 1] = [];
        }
        let history = match.opponentScoreHistory[match.legNo - 1];
        history.push(score);
        match.opponentScoreHistory[match.legNo - 1] = history;
      } else if (currentScore - score === 0) {
        match.opponentWins = match.opponentWins + 1;
        match.legNo = match.legNo + 1;
        match.challengerScore = 501;
        match.opponentScore = 501;
      }

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

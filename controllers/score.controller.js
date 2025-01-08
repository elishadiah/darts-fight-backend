const ScoreModel = require("../models/score.model.js");
const ResultModel = require("../models/result.model.js");
const UserModel = require("../models/user.model.js");

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
    const [player1Result, player2Result] = await Promise.all([
      ResultModel.findOne({ username: challenger }),
      ResultModel.findOne({ username: opponent }),
    ]);

    await ScoreModel.create({
      token,
      bullScores: [],
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
        initialResult: { ...player2Result },
      },
    });

    console.log("Match created successfully");
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

    const getPlayerAndOpponent = (user) => {
      if (user === match.p1.name) {
        return { player: match.p1, opponent: match.p2 };
      } else if (user === match.p2.name) {
        return { player: match.p2, opponent: match.p1 };
      } else {
        throw new Error("Invalid user");
      }
    };

    const { player, opponent } = getPlayerAndOpponent(user);
    player.currentScore -= score;

    if (!player.scoreHistory[match.legNo - 1]) {
      player.scoreHistory[match.legNo - 1] = { scores: [] };
    }
    let history = player.scoreHistory[match.legNo - 1].scores;
    history.push(score);
    player.scoreHistory[match.legNo - 1].scores = history;
    player.darts_thrown = (player.darts_thrown || 0) + 3;

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
        to_finish: score,
        scores: player.scoreHistory[match.legNo - 1].scores,
      };
      match.legNo = match.legNo + 1;

      const p1BullScore = match.bullScores.find(
        (bull) => bull.username === match.p1.name
      ).score;
      const p2BullScore = match.bullScores.find(
        (bull) => bull.username === match.p2.name
      ).score;

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

const updateDouble = async (req, res) => {
  try {
    const { token, user, doubles } = req.body;

    const match = await ScoreModel.findOne({ token });

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const player = user === match.p1.name ? match.p1 : match.p2;
    if (!player) {
      return res.status(400).json({ message: "Invalid user" });
    }

    player.darts_missed_double += Number(doubles.missed);
    player.darts_thrown_double += Number(doubles.throw);

    const updateMatch = await match.save();
    res.json(updateMatch);
  } catch (err) {
    console.log("update-match-err->", err);
    res.status(500).json({ message: err.message });
    throw err;
  }
};

const updateBullScore = async (token, score, username) => {
  try {
    const match = await ScoreModel.findOne({ token });

    if (!match) {
      throw new Error("Match not found");
    }

    match.bullScores.push({ score, username });
    const updateMatch = await match.save();

    if (updateMatch.bullScores.length === 2) {
      updateMatch.bullModal = false;
      const p1BullScore = updateMatch.bullScores.find(
        (bull) => bull.username === updateMatch.p1.name
      ).score;
      const p2BullScore = updateMatch.bullScores.find(
        (bull) => bull.username === updateMatch.p2.name
      ).score;
      updateMatch.challengerTurn = p1BullScore > p2BullScore;
      const updatedMatch = await updateMatch.save();
      return updatedMatch;
    }

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

    match.bullScores.push({ score, username });
    const updateMatch = await match.save();

    if (updateMatch.bullScores.length === 2) {
      updateMatch.bullModal = false;
      const p1BullScore = updateMatch.bullScores.find(
        (bull) => bull.username === updateMatch.p1.name
      ).score;
      const p2BullScore = updateMatch.bullScores.find(
        (bull) => bull.username === updateMatch.p2.name
      ).score;

      updateMatch.challengerTurn = p1BullScore > p2BullScore;

      const updatedMatch = await updateMatch.save();
      const opponent =
        username === updateMatch.p1.name
          ? updateMatch.p2.name
          : updateMatch.p1.name;
      const user = await UserModel.findOne({ username: opponent });
      const socket = req.app.get("socketIo");
      socket.to(user._id.toString()).emit("bull-score", updatedMatch);
      // socket.emit("bull-score", updatedMatch);

      return res.json(updatedMatch);
    }

    res.json(updateMatch);
  } catch (err) {
    console.log("update-bull-score-err->", err);
    res.status(500).json({ message: err.message });
    throw err;
  }
};

module.exports = {
  getScores,
  createMatch,
  getMatchStatus,
  updateMatchScore,
  updateDouble,
  updateMatchFinish,
  updateBullScore,
  updateBullScoreApi,
};

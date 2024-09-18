const ArenaModel = require("../models/arena.model");
const UserModel = require("../models/user.model");
const cron = require("node-cron");

// Create a new arena
const createArena = async (req, res) => {
  try {
    const { title } = req.body;
    const newArena = new ArenaModel({ title });
    const savedArena = await newArena.save();
    res.status(201).json(savedArena);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all arenas
const getArenas = async (req, res) => {
  try {
    const arenas = await ArenaModel.find();
    res.status(200).json(arenas);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get joined users by arena title
const getJoinedUsersByTitle = async (req, res) => {
  try {
    const { title } = req.params;
    const arena = await ArenaModel.findOne({ title });
    if (!arena) {
      return res.status(404).json({ message: "Arena not found" });
    }

    res.status(200).json(arena.joinedUsers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const calculateScore = (scoring) => {
  const variability = Math.random() * 0.2 - 0.1; // +/- 10%
  return scoring * (1 + variability);
};

const checkCheckoutSuccess = (player) => {
  return Math.random() < player.checkout / 100;
};

const applyEdge = (player1, player2) => {
  const scoreDifference = Math.abs(
    player1.remainingPoints - player2.remainingPoints
  );
  let randomEdge = Math.random() * 100;

  if (scoreDifference <= randomEdge) {
    return player1.edge > player2.edge ? player1 : player2;
  }
  return player1.remainingPoints < player2.remainingPoints ? player1 : player2;
};

const selectRandomPlayer = (players) => {
  return players[Math.floor(Math.random() * players.length)];
};

const playSingleMatch = (player1, player2) => {
  let challenger = {
    username: player1.username,
    scoring: player1.vAvatar.scoring,
    checkout: player1.vAvatar.checkout,
    edge: player1.vAvatar.edge,
    remainingPoints: 501,
  };
  let opponent = {
    username: player2.username,
    scoring: player2.vAvatar.scoring,
    checkout: player2.vAvatar.checkout,
    edge: player2.vAvatar.edge,
    remainingPoints: 501,
  };

  let turn = 0;
  let winner;
  let player1Scores = [],
    player2Scores = [];

  while (challenger.remainingPoints > 0 && opponent.remainingPoints > 0) {
    const currentPlayer = turn % 2 === 0 ? challenger : opponent;

    const score = calculateScore(currentPlayer.scoring);
    currentPlayer.remainingPoints -= Math.round(score);
    if (turn % 2 === 0) {
      player1Scores.push(Math.round(score));
    } else {
      player2Scores.push(Math.round(score));
    }

    if (currentPlayer.remainingPoints < 100) {
      const checkoutSuccess = checkCheckoutSuccess(currentPlayer);

      if (checkoutSuccess) {
        console.log(`${currentPlayer.username} won the match!`);
        winner = currentPlayer;
        return { winner, player1Scores, player2Scores };
      }
    }

    turn++;
  }

  winner = applyEdge(challenger, opponent);
  console.log(`${winner.username} won the match!`);
  return { winner, player1Scores, player2Scores };
};

const playMatchSeries = async (player1, player2, arenaTitle) => {
  console.log(
    "Match series started between",
    player1.username,
    "and",
    player2.username
  );

  let player1Wins = 0;
  let player2Wins = 0;
  let matchNo = 0;
  let matchResults = [];

  while (player1Wins < 3 && player2Wins < 3) {
    matchNo++;
    const { winner, player1Scores, player2Scores } = playSingleMatch(
      player1,
      player2,
      matchNo
    );
    matchResults.push({
      matchNo,
      winner: winner.username,
      player1Scores,
      player2Scores,
    });

    if (winner.username === player1.username) {
      player1Wins++;
    } else {
      player2Wins++;
    }
    console.log(`${winner.username} won a match!`);
  }

  const overallWinner = player1Wins === 3 ? player1 : player2;
  console.log(`${overallWinner.username} won the series!`);

  const arena = await ArenaModel.findOne({ title: arenaTitle });
  arena.matchResults.push({
    player1: player1.username,
    player2: player2.username,
    results: matchResults,
    winner: overallWinner.username,
  });
  await arena.save();

  return overallWinner;
};

const startMatch = async (user, arenaTitle) => {
  try {
    const arena = await ArenaModel.findOne({ title: arenaTitle });
    const userId = user._id.toString();

    if (!arena.idleUsers.includes(userId)) return;

    const arenaIdlesUsers = arena.idleUsers.filter(
      (idleUser) => idleUser !== userId
    );

    const idleUsers = await UserModel.find({ _id: { $in: arenaIdlesUsers } });

    const proceedWithMatch = async (arena, arenaIdleUsers) => {
      const opponentId = selectRandomPlayer(arenaIdleUsers);
      const opponent = await UserModel.findById(opponentId);

      arena.idleUsers = arenaIdleUsers.filter(
        (idleUser) => idleUser !== opponentId
      );
      await arena.save();

      playMatchSeries(user, opponent, arenaTitle);
    };

    if (idleUsers.length === 0) {
      return;
      // const job = cron.schedule("* * * * * *", async () => {
      //   try {
      //     const updatedArena = await ArenaModel.findOne({ title: arenaTitle });
      //     const updatedArenaIdlesUsers = updatedArena.idleUsers.filter(
      //       (idleUser) => idleUser !== userId
      //     );
      //     const updatedIdleUsers = await UserModel.find({
      //       _id: {
      //         $in: updatedArenaIdlesUsers,
      //       },
      //     });

      //     if (updatedIdleUsers.length > 0) {
      //       console.log("Idle user found, proceeding with match...");
      //       job.stop();
      //       await proceedWithMatch(updatedArena, updatedArenaIdlesUsers);
      //     } else {
      //       console.log("No idle users yet, waiting...");
      //     }
      //   } catch (err) {
      //     console.error("Error during cron job execution:", err);
      //   }
      // });
    } else {
      console.log("Idle users found, proceeding with match...");
      // Proceed with match logic here
      await proceedWithMatch(arena, arenaIdlesUsers);
    }
  } catch (err) {
    console.error("Error starting match:", err);
  }
};

// Start arena match
const startArenaMatch = async (req, res) => {
  try {
    const { title, username } = req.params;
    const arena = await ArenaModel.findOne({ title });
    if (!arena) {
      return res.status(404).json({ message: "Arena not found" });
    }

    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = user._id.toString();

    if (!arena.joinedUsers.includes(userId)) {
      arena.joinedUsers.push(userId);
      arena.idleUsers.push(userId);

      await arena.save();
    }

    startMatch(user, title);

    res.status(200).json({ message: "Match started" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const resetArena = async (req, res) => {
  try {
    const { title } = req.params;
    const arena = await ArenaModel.findOne({ title });

    if (!arena) {
      return res.status(404).json({ message: "Arena not found" });
    }

    arena.joinedUsers = [];
    arena.idleUsers = [];

    await arena.save();

    res.status(200).json({ message: "Arena reset" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createArena,
  getArenas,
  getJoinedUsersByTitle,
  startArenaMatch,
  resetArena,
};

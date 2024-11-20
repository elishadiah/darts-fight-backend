const ArenaModel = require("../models/arena.model");
const UserModel = require("../models/user.model");
const NotificationModel = require("../models/notification.model");

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

// Get arena by title
const getArenaByTitle = async (req, res) => {
  try {
    const { title } = req.params;
    const arena = await ArenaModel.findOne({ title });
    if (!arena) {
      return res.status(404).json({ message: "Arena not found" });
    }

    res.status(200).json(arena);
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

    const joinedUsers = await UserModel.find({
      _id: { $in: arena.joinedUsers },
    });

    res.status(200).json(joinedUsers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const calculateScore = (scoring) => {
  const variability = Math.random() * 0.2 - 0.1; // +/- 10%
  return scoring * (1 + variability);
};

const checkCheckoutSuccess = (player) => {
  return Math.random() * 10 < player.checkout;
};

const applyEdge = (player1, player2) => {
  const scoreDifference = Math.abs(
    player1.remainingPoints - player2.remainingPoints
  );
  let randomEdge = Math.random() * 10;

  if (scoreDifference >= randomEdge) {
    return player1.edge > player2.edge ? player1 : player2;
  }
  return player1.remainingPoints < player2.remainingPoints ? player1 : player2;
};

const selectRandomPlayer = (players) => {
  return players[Math.floor(Math.random() * players.length)];
};

const playSingleMatch = (player1, player2, firstTurn) => {
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

  let turn = firstTurn;
  let winner;
  let player1Scores = [],
    player2Scores = [];

  while (challenger.remainingPoints > 0 && opponent.remainingPoints > 0) {
    const currentPlayer = turn % 2 === 0 ? challenger : opponent;

    const score = calculateScore(currentPlayer.scoring);

    if (currentPlayer.remainingPoints - Math.round(score) >= 0) {
      currentPlayer.remainingPoints -= Math.round(score);
      if (turn % 2 === 0) {
        player1Scores.push(currentPlayer.remainingPoints);
      } else {
        player2Scores.push(currentPlayer.remainingPoints);
      }
    }

    if (currentPlayer.remainingPoints < currentPlayer?.scoring) {
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

const checkBullseye = (player1, player2) => {
  const randomBullseye = Math.random() * 100;
  if (randomBullseye < player1?.vAvatar?.bullseye) {
    return 0;
  } else if (randomBullseye < player2?.vAvatar?.bullseye) {
    return 1;
  }
  return 0;
};

const playMatchSeries = async (
  player1,
  player2,
  arenaTitle,
  option,
  socket,
  res
) => {
  try {
    const user1 = await UserModel.findById(player1._id);
    const user2 = await UserModel.findById(player2._id);

    console.log(
      "Starting match series between",
      user1.username,
      "and",
      user2.username,
      "-->>",
      user2.stamina
    );

    user1.stamina -= 10;
    await user1.save();
    user2.stamina -= 10;
    await user2.save();

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

    let firstTurn = checkBullseye(user1, user2);

    while (player1Wins < 3 && player2Wins < 3) {
      matchNo++;
      const { winner, player1Scores, player2Scores } = playSingleMatch(
        player1,
        player2,
        firstTurn
      );

      firstTurn = firstTurn === 0 ? 1 : 0;

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

    let message;

    if (overallWinner.username === player1.username) {
      message = `${
        player1.username
      } won ${player1Wins} : ${player2Wins} in the Fight against ${
        player2.username
      } in the Sparring Arena. ${player1.username} gets ${
        1 + user1.vAvatar.ranks
      } XP.`;
    } else {
      message = `${
        player2.username
      } won ${player2Wins} : ${player1Wins} in the Fight against ${
        player1.username
      } in the Sparring Arena. ${player2.username} gets ${
        1 + user2.vAvatar.ranks
      } XP.`;
    }

    const notification1 = new NotificationModel({
      message,
      to: player1._id.toString(),
      read: false,
    });
    const notification2 = new NotificationModel({
      message,
      to: player2._id.toString(),
      read: false,
    });

    const noti = await notification1.save();
    await notification2.save();

    socket
      .to(player1._id.toString())
      .to(player2._id.toString())
      .emit("arena-match-results", {
        player1: player1.username,
        player2: player2.username,
        results: matchResults,
        winner: overallWinner.username,
        date: new Date(),
        notification: noti,
      });

    const arena = await ArenaModel.findOne({ title: arenaTitle });
    arena.matchResults.push({
      player1: player1.username,
      player2: player2.username,
      results: matchResults,
      winner: overallWinner.username,
      date: new Date(),
    });
    arena.idleUsers.push(player1._id.toString());
    arena.idleUsers.push(player2._id.toString());
    await arena.save();

    if (option === "Auto") {
      startMatch(user1, arenaTitle, option, socket, res);
      // startMatch(user2, arenaTitle, option, socket, res);
    }

    if (overallWinner.username === player1.username) {
      user1.isArena = true;
      user1.xp += 1 + user1.vAvatar.ranks;
      user1.dXp += 1 + user1.vAvatar.ranks;
      user2.isArena = false;
      await user1.save();
      await user2.save();
    } else {
      user1.isArena = false;
      user2.isArena = true;
      user2.xp += 1 + user2.vAvatar.ranks;
      user2.dXp += 1 + user2.vAvatar.ranks;
      await user1.save();
      await user2.save();
    }

    if (option === "Manual") {
      return res.status(200).json({
        player1: player1.username,
        player2: player2.username,
        results: matchResults,
        winner: overallWinner.username,
        date: new Date(),
        message,
      });
    }
  } catch (error) {
    console.error("Error in playMatchSeries:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

const startMatch = async (user, arenaTitle, option, socket, res) => {
  try {
    if (user.stamina < 10)
      return res.status(400).json({
        message: "You don't have enough stamina to play arena fight.",
      });

    const arena = await ArenaModel.findOne({ title: arenaTitle });
    const userId = user._id.toString();

    if (!arena.idleUsers.includes(userId))
      return res
        .status(400)
        .json({ message: "You are not in the idle users list" });

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

      console.log(
        "Match found between",
        user.username,
        "and",
        opponent.username
      );

      if (opponent.stamina < 10 || user.stamina < 10) {
        const arena = await ArenaModel.findOne({ title: arenaTitle });
        arena.idleUsers.push(user._id.toString());
        arena.idleUsers.push(opponent._id.toString());
        await arena.save();
        startMatch(user, arenaTitle, option, socket, res);
        return;
      }

      playMatchSeries(user, opponent, arenaTitle, option, socket, res);
    };

    if (idleUsers.length === 0) {
      if (option === "Manual") {
        return res.status(400).json({ message: "No idle users found" });
      } else {
        return;
      }
    } else {
      console.log("Idle users found, proceeding with match...");
      await proceedWithMatch(arena, arenaIdlesUsers);
    }
  } catch (err) {
    console.error("Error starting match:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal server error" });
    }
  }
};

const socketTest = async (socket) => {
  const arena = await ArenaModel.findOne({ title: "Sparring" });

  let idleUsers = arena.idleUsers;

  const removeRandomUser = (users) => {
    if (users.length === 0) return users;

    const randomIndex = Math.floor(Math.random() * users.length);
    users.splice(randomIndex, 1);

    console.log("Starting match for", socket.username);
    socket.broadcast.emit("arena-match-results", randomIndex);

    return removeRandomUser(users);
  };

  idleUsers = removeRandomUser(idleUsers);
};

// Start arena match
const startArenaMatch = async (req, res) => {
  try {
    const { title, username } = req.params;
    const { option } = req.body;
    console.log("Starting match for", username, "in arena", title);
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
      await arena.save();
    }

    if (!arena.idleUsers.includes(userId)) {
      arena.idleUsers.push(userId);
      await arena.save();
    }

    if (user.stamina < 10) {
      return res.status(400).json({
        message: "You don't have enough stamina to play arena fight.",
      });
    }

    const socket = req.app.get("socketIo");
    // socket.broadcast.emit("arena-match-results", "test");
    // socketTest(socket);
    startMatch(user, title, option, socket, res);

    // io.on("connection", async (socket) => {
    //   if (!eventEmitted) {
    //     startMatch(user, title, socket);
    //   }
    // });

    if (option === "Auto") {
      res.status(200).json({ message: "Arena Fight started" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get match results by arena title
const getMatchResultsByTitle = async (req, res) => {
  try {
    const { title } = req.params;
    const { page = 1, limit = 6, username = "" } = req.query;
    console.log(
      "Getting match results for",
      title,
      "-->>",
      page,
      limit,
      username
    );

    const arena = await ArenaModel.findOne({ title });

    if (!arena) {
      return res.status(404).json({ message: "Arena not found" });
    }

    // const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const matchResults = arena.matchResults
      .reverse()
      .filter(
        (result) =>
          result.player1.includes(username) || result.player2.includes(username)
      )
      .slice(0, endIndex);

    res.status(200).json({
      matchResults,
      currentPage: page,
      totalPages: Math.ceil(arena.matchResults.length / limit),
    });
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

    // arena.joinedUsers = [];
    // arena.idleUsers = [];
    arena.matchResults = [];

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
  getArenaByTitle,
  startArenaMatch,
  getMatchResultsByTitle,
  resetArena,
};

const ResultModel = require("../models/result.model");
const EventModel = require("../models/events.model");
const SeasonModel = require("../models/season.model");
const UserModel = require("../models/user.model");
const ScheduleModel = require("../models/schedule.model");
const ScoreModel = require("../models/score.model");
const axios = require("axios");
const { updateXPAndRank } = require("./auth.controller");
const { handleAchievement } = require("../utils/achievementsUtils");
const {
  findUserResult,
  combineResultsAndUsers,
  calculateXP,
} = require("../utils/utils");
const { updateSeasonTopMembers } = require("./season.controller");
const { deleteSchedulesByToken } = require("./schedule.controller");
const {
  getPlayerUpdates,
  getFinalUpdates,
} = require("../utils/resultAchievementUtils");
const {
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
  updateSummary,
  updateConsistentScorer,
  updateMaster26,
  updateThrowCount,
  updateHighFinish,
  updateIronDart,
} = require("../utils/resultUtils");

const getLidartsResult = async (req, res) => {
  try {
    const { url } = req.query.params;
    if (!url) {
      return res.status(400).json({ error: "URL parameter is required" });
    }
    const allResults = await ResultModel.find();
    const response = await axios.get(url);
    const {
      p1_name,
      p2_name,
      p1_match_avg,
      p2_match_avg,
      p1_legs_won,
      p2_legs_won,
      match_json,
      begin,
      end,
    } = response.data;

    const user1InitResult = findUserResult(allResults, p1_name);
    const user2InitResult = findUserResult(allResults, p2_name);

    if (!user1InitResult || !user2InitResult) {
      return res.status(404).json({ error: "User not found" });
    }

    const user1 = {
      name: p1_name,
      won: p1_legs_won,
      avg: p1_match_avg,
      init: user1InitResult,
    };
    const user2 = {
      name: p2_name,
      won: p2_legs_won,
      avg: p2_match_avg,
      init: user2InitResult,
    };

    res.status(200).json({
      user1,
      user2,
      begin,
      end,
      allResults,
      result: JSON.parse(match_json)[1],
      matchResult: response.data,
    });
  } catch (error) {
    console.error("Error fetching Lidarts result:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchResult = async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  try {
    const results = await ResultModel.find();
    if (!results) {
      return res.status(500).json({ error: "Could not find results" });
    }
    const userResult = findUserResult(results, username);
    if (userResult) {
      return res.status(200).json(userResult);
    } else {
      return res.status(404).json({ error: "No result found for this user" });
    }
  } catch (error) {
    console.error("Error fetching result:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchAllResults = async (req, res) => {
  try {
    const results = await ResultModel.find().lean().exec();
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching all results:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchUsersForResults = async (results) => {
  const usersPromises = results.map((result) =>
    UserModel.findOne({ username: result.username })
  );
  return await Promise.all(usersPromises);
};

const fetchAllResultsAndUsers = async (req, res) => {
  try {
    const results = await ResultModel.find();
    if (!results) {
      return res.status(500).json({ error: "Could not find results" });
    }
    const users = await fetchUsersForResults(results);
    const combinedData = combineResultsAndUsers(results, users);
    res.status(200).json(combinedData);
  } catch (error) {
    console.error("Error fetching results and users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const adminUpdateResult = async (req, res) => {
  const { username, level, ...updateFields } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  try {
    const existingResult = await ResultModel.findOne({ username });
    if (!existingResult) {
      return res.status(404).json({ error: "Could not find result!" });
    }
    const updatedResult = await ResultModel.findOneAndUpdate(
      { username },
      updateFields,
      { new: true, runValidators: true }
    );
    await updateSeasonTopMembers(updatedResult, level);
    res.status(200).json({ message: "Success!" });
  } catch (error) {
    console.error("Error updating result:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const postResult = async (req, res) => {
  const { data, token, type = "quick" } = req.body;
  const { username } = data;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  try {
    const existingResult = await ResultModel.findOne({ username });
    if (!existingResult) {
      return res.status(404).json({ error: "Could not find result!" });
    }
    const schedules = await ScheduleModel.find({
      $or: [{ receiver: username }, { challenger: username }],
    });
    if (type === "quick" || type === "top-quick") {
      if (existingResult.quickToken !== token) {
        return res.status(400).json({ error: "Invalid token!" });
      }
    } else {
      if (!schedules.length) {
        return res.status(400).json({ error: "No schedule found!" });
      }
      const isValid = schedules.some((schedule) => schedule.token === token);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid token!" });
      }
    }
    const newResult = await ResultModel.findOneAndUpdate(
      { username: data.username, email: data.email },
      {
        ...data,
        level: type === "quick" ? data.level : existingResult.level,
        active: true,
      },
      { new: true, runValidators: true }
    );
    await EventModel.create({
      eventType: "match",
      user: data.username,
      targetUser: data.targetUser,
      match: {
        link: data.link,
        user1Won: data.won,
        user2Won: data.targetWon,
        achievements: data.earnedAchievements,
      },
    });
    if (type === "quick") {
      await updateSeasonTopMembers(newResult, data.level);
    }
    if (type === "schedule") {
      await deleteSchedulesByToken(schedules, token);
    }
    res.status(200).json({ message: "Success!" });
  } catch (error) {
    rconsole.error("Error posting result:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const finishMatchAPI = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }
  try {
    const score = await ScoreModel.findOne({ token });
    if (!score) {
      return res.status(404).json({ error: "Score not found!" });
    }
    score.isFinished = true;
    await score.save();
    await updateAchievements(score);
    res.status(200).json({ message: "Match finished successfully!" });
  } catch (error) {
    console.error("Error finishing match:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const calculateRowSpotNo = async (level) => {
  const availablePositionNo = Math.pow(2, 7 - level);
  const currentAbovePlayersNo = await ResultModel.countDocuments({
    level: level + 1,
  });
  return availablePositionNo - currentAbovePlayersNo;
};

const updateAchievements = async (data) => {
  try {
    const player1Result = data.p1.initialResult;
    const player2Result = data.p2.initialResult;
    const rowSpotNo = calculateRowSpotNo(player1Result.level);

    const { user: player1Streaks, opponent: player2Streaks } =
      updateCurrentStreaks(data.p1, data.p2, player1Result, player2Result);
    const { user: player1Wins, opponent: player2Wins } = updateWinsAndLevel(
      data.p1,
      data.p2,
      player1Result,
      player2Result,
      rowSpotNo
    );
    const { user: player1Protector, opponent: player2Protector } =
      updatePyramidProtector(data.p1, data.p2, player1Result, player2Result);
    const { user: player1Legendary, opponent: player2Legendary } =
      updateLegendaryRivalry(player1Result, player2Result);
    const { user: player1Master180, opponent: player2Master180 } =
      updateMaster180(data.p1, data.p2, player1Result, player2Result);
    const { user: player1GrandMaster, opponent: player2GrandMaster } =
      updateGrandMaster(data.p1, data.p2, player1Result, player2Result);
    const { user: player1MaxMarksMan, opponent: player2MaxMarksMan } =
      updateMaxMarksman(data.p1, data.p2);

    const [updatedUser, updatedOpponent] = await Promise.all([
      ResultModel.findByIdAndUpdate(
        player1Result._id,
        {
          ...player1Streaks,
          ...player1Wins,
          ...player1Protector,
          ...player1Legendary,
          ...player1Master180,
          ...player1GrandMaster,
          ...player1MaxMarksMan,
          ...updateDartEnthusiast(player1Result),
          ...updateFriendlyChallenger(player1Result),
          ...updateChampionChallenger(player2Result),
          ...updateConsistentScorer(data.p1, player1Result),
          ...updateMaster26(data.p1, player1Result),
          ...updateThrowCount(data.p1, player1Result),
          ...updateHighFinish(data.p1, player1Result),
          ...updateIronDart(data.p1, data.p2, player1Result),
        },
        { new: true }
      ),
      ResultModel.findByIdAndUpdate(
        player2Result._id,
        {
          ...player2Streaks,
          ...player2Wins,
          ...player2Protector,
          ...player2Legendary,
          ...player2Master180,
          ...player2GrandMaster,
          ...player2MaxMarksMan,
          ...updateReadyForIt(player2Result),
          ...updateChallengeConqueror(data.p1, data.p2, player2Result),
          ...updateConsistentScorer(data.p2, player2Result),
          ...updateMaster26(data.p2, player2Result),
          ...updateThrowCount(data.p2, player2Result),
          ...updateHighFinish(data.p2, player2Result),
          ...updateIronDart(data.p2, data.p1, player1Result),
        },
        { new: true }
      ),
    ]);

    const { user: player1PyramidClimber, opponent: player2PyramidClimber } =
      updatePyramidClimber(
        updatedUser,
        updatedOpponent,
        player1Result,
        player2Result
      );
    const { user: player1MaxStreaks, opponent: player2MaxStreaks } =
      updateMaxStreaks(data.p1, data.p2, player1Result, player2Result);

    const [finalUser, finalOpponent] = await Promise.all([
      ResultModel.findByIdAndUpdate(player1Result._id, {
        ...player1PyramidClimber,
        ...player1MaxStreaks,
        ...updateMonthlyMaestro(player1Result, updatedUser),
        ...updateSummary(data.date, data.p1, updatedUser, player1Result),
      }),
      ResultModel.findByIdAndUpdate(player2Result._id, {
        ...player2PyramidClimber,
        ...player2MaxStreaks,
        ...updateMonthlyMaestro(player2Result, updatedOpponent),
        ...updateSummary(data.date, data.p2, updatedOpponent, player2Result),
      }),
    ]);

    await ScoreModel.findOneAndUpdate(
      { token: data.token },
      {
        "p1.updatedResult": finalUser,
        "p2.updatedResult": finalOpponent,
      }
    );
    const earnedAchievement1 = handleAchievement(
      finalUser,
      player1Result,
      data.p1.scoreHistory
    );
    const earnedAchievement2 = handleAchievement(
      finalOpponent,
      player2Result,
      data.p2.scoreHistory
    );

    await createMatchEvent(data, earnedAchievement1, earnedAchievement2);

    const xpToAdd1 = calculateXP(
      finalUser.previousWin,
      earnedAchievement1.length
    );
    const xpToAdd2 = calculateXP(
      finalOpponent.previousWin,
      earnedAchievement2.length
    );

    await Promise.all([
      updateXPAndRank(data.p1.name, xpToAdd1),
      updateXPAndRank(data.p2.name, xpToAdd2),
    ]);

    console.log("Updated Achievements: success");
  } catch (err) {
    console.log("update-achievements-err-->>>", err);
  }
};

const createMatchEvent = async (
  data,
  earnedAchievement1,
  earnedAchievement2
) => {
  await EventModel.create({
    eventType: "match",
    user: data.p1.name,
    targetUser: data.p2.name,
    match: {
      link: `/result/${data.token}/quick`,
      user1Won: data.p1.legs_won,
      user2Won: data.p2.legs_won,
      achievements: earnedAchievement1,
    },
  });

  await EventModel.create({
    eventType: "match",
    user: data.p2.name,
    targetUser: data.p1.name,
    match: {
      link: `/result/${data.token}/quick`,
      user1Won: data.p2.legs_won,
      user2Won: data.p1.legs_won,
      achievements: earnedAchievement2,
    },
  });
};

const inactiveUser = async (req, res) => {
  try {
    await ResultModel.findByIdAndUpdate(req.body.id, {
      active: req.body.active,
    });
    res.status(200).json("Inactive success!");
  } catch (err) {
    console.log("Aggregate-->>", err);
    res.status(422).json(err);
  }
};

const bulkActivateUsers = async (req, res) => {
  try {
    let updateResult;
    let selectedIds = req.body.items.map((item) => item.id);
    if (req.body.active) {
      updateResult = await ResultModel.updateMany(
        { _id: { $in: selectedIds }, active: false }, // Filter criteria
        { $set: { active: true } } // Update action
      );
    } else {
      updateResult = await ResultModel.updateMany(
        { _id: { $in: selectedIds }, active: true }, // Filter criteria
        { $set: { active: false } } // Update action
      );
    }

    const activeUsers = await ResultModel.find({ active: true });

    const season = await SeasonModel.findOne().sort({ season: -1 });

    if (season) {
      await SeasonModel.findByIdAndUpdate(season._id, {
        activeUsers: activeUsers?.length,
      });
    }

    // Respond with the number of documents updated
    res
      .status(200)
      .json(`${updateResult.nModified} users activated successfully!`);
  } catch (err) {
    console.log("Error in bulkActivateUsers-->>", err);
    res.status(422).json(err);
  }
};

// Jacks Victory Achievement and XP
const jacksVictoryAchievement = async (req, res) => {
  try {
    const { username } = req.body;

    const result = await ResultModel.findOne({ username });

    if (!result) {
      return res.status(404).json("User not found!");
    }

    await ResultModel.findByIdAndUpdate(result._id, {
      isJacksVictory: true,
    });

    const user = await UserModel.findOne({ username });

    if (user) {
      await UserModel.findByIdAndUpdate(user._id, {
        $inc: { xp: 50 },
      });
    }

    const socket = req.app.get("socketIo");

    socket.emit("jacks-victory", { username });

    res.status(200).json("Jacks Victory achievement added successfully!");
  } catch (err) {
    console.log("Error in jacksVictoryAchievement-->>", err);
    res.status(422).json(err);
  }
};

const addField = async (req, res) => {
  try {
    await ResultModel.updateMany(
      {},
      [
        {
          $set: {
            isJacksRewarded: false,
          },
        },
      ],
      {
        upsert: false,
      }
    );
    res.status(200).json("Add success!");

    // const updateResult = await ResultModel.updateMany(
    //   {},
    //   { $unset: { acceptWeekChallengeNo: 0 } }
    // );

    // res.status(200).json(updateResult.modifiedCount + " document(s) deleted.");

    // await GlobalCoinModel.create({
    //   amount: 0,
    // });

    // res.status(200).json("Create success!");
  } catch (err) {
    console.log("Aggregate-->>", err);
    res.status(422).json(err);
  }
};

const migrateField = async (req, res) => {
  try {
    const results = await ResultModel.find({
      dartEnthusiast: { $exists: true, $type: "number" },
    });

    for (let result of results) {
      await ResultModel.findByIdAndUpdate(result._id, {
        $set: {
          dartEnthusiast: {
            season: 0,
            lifetime: 0,
          },
        },
      });
    }

    res.status(200).json("Migrate success!");
  } catch (err) {
    console.log("Migrate-failed-->>", err);
    res.status(422).json(err);
  }
};

module.exports = {
  getLidartsResult,
  postResult,
  fetchResult,
  fetchAllResult,
  addField,
  inactiveUser,
  adminUpdateResult,
  migrateField,
  bulkActivateUsers,
  fetchAllResultsAndUsers,
  jacksVictoryAchievement,
  updateAchievements,
  finishMatchAPI,
};

const puppeteer = require("puppeteer");
const ResultModel = require("../models/result.model");
const EventModel = require("../models/events.model");
const SeasonModel = require("../models/season.model");
const GlobalCoinModel = require("../models/globalCoin.model");
const UserModel = require("../models/user.model");
const ScheduleModel = require("../models/schedule.model");
const CommunityModel = require("../models/community.model");
const axios = require("axios");
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
} = require("../utils/resultUtils");

const getSubResult = (req, res) => {
  const { url } = req.body;
  console.log("-----SUB--RESULT-----");
  puppeteer
    .launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      browserContext: "default",
      // executablePath: '/usr/bin/chromium-browser'
    })
    .then(async (browser) => {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        if (
          request.resourceType() === "image" ||
          request.resourceType() === "stylesheet"
        ) {
          request.abort();
        } else {
          request.continue();
        }
      });
      await page.goto(url, {
        waitUntil: "load",
        timeout: 0,
      });

      let subResult;

      try {
        await page.waitForSelector(
          ".card .card-body > div:first-child ~ div > div.d-sm-block > h1"
        );

        subResult = await page.evaluate(() => {
          const fruitsList = document.body.querySelectorAll(
            ".card .card-body > div:first-child ~ div > div.d-sm-block > h1"
          );

          let fruits = [];

          fruitsList.forEach((value) => {
            fruits.push(value.innerText);
          });
          return fruits;
        });
      } catch (e) {
        console.log("sub-err-->>", e);
        res.status(500).json(e);
      }

      console.log("Sub--res--->>>>", subResult);

      res.json({ subResult });
    })
    .catch(function (err) {
      console.log("Sub-Browser-err-->>>>", err);
    });
};

// getResult = (req, res) => {
//   const destUrl = req.body.url;
//   puppeteer
//     .launch({
//       headless: true,
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//       browserContext: "default",
//       // executablePath: '/usr/bin/chromium-browser'
//     })
//     .then(async (browser) => {
//       const page = await browser.newPage();

//       await page.setRequestInterception(true);
//       page.on("request", (request) => {
//         if (
//           request.resourceType() === "image" ||
//           request.resourceType() === "stylesheet"
//         ) {
//           request.abort();
//         } else {
//           request.continue();
//         }
//       });

//       await page.goto(destUrl, { waitUntil: "load", timeout: 0 });

//       let totalResult, allResult, userResult;

//       try {
//         await page.waitForSelector(
//           // ".container-fluid div .card .card-body div.col-3 > h3"
//           ".container-fluid div .card .card-body p, h3"
//         );

//         totalResult = await page.evaluate(() => {
//           const fruitsList = document.body.querySelectorAll(
//             // ".container-fluid div .card .card-body div.col-3 > h3"
//             ".container-fluid div .card .card-body p, h3"
//           );

//           let fruits = [];

//           fruitsList.forEach((value) => {
//             fruits.push(value.innerText);
//           });
//           return fruits;
//         });
//       } catch (e) {
//         console.log("total-err-->>", e);
//         res.status(500).json(e);
//       }

//       res.json(totalResult);

//       await browser.close();
//     })
//     .catch(function (err) {
//       res.status(500).json(err);
//       console.log("Browser-err-->>>", err);
//     });
// };

const isEmpty = (data) => {
  if (data.length === 0 || data === null || data === undefined) return true;
  else return false;
};

const getResult = async (req, res) => {
  try {
    const allResult = await ResultModel.find();
    const response = await axios.get(req.query.params.url);
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

    const user1InitResult = allResult.find(
      (val) => val.username.trim().toLowerCase() === p1_name.toLowerCase()
    );

    const user2InitResult = allResult.find(
      (val) => val.username.trim().toLowerCase() === p2_name.toLowerCase()
    );

    if (!user1InitResult || !user2InitResult) {
      return res.status(404).json("User not found");
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
      allResult,
      result: JSON.parse(match_json)[1],
      matchResult: response.data,
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

const fetchResult = async (req, res) => {
  const { username } = req.body;
  try {
    const result = await ResultModel.find();
    let existResult;
    if (result) {
      existResult = result.find((val) =>
        val?.username?.toLowerCase().includes(username)
      );
    } else return res.status(500).json("Could not find result!");
    if (existResult) res.status(200).json(existResult);
    else res.status(404).json("There is no result for this user.");
  } catch (err) {
    res.status(500).json(err);
  }
};

const fetchAllResult = async (req, res) => {
  try {
    const result = await ResultModel.find().lean().exec();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json(err);
  }
};

const fetchAllResultsAndUsers = async (req, res) => {
  try {
    const results = await ResultModel.find();

    if (results.length > 0) {
      const usersPromises = results.map((result) =>
        UserModel.findOne({ username: result.username })
      );

      const users = await Promise.all(usersPromises);

      const combinedData = results.map((result, index) => {
        const user = users[index];
        return user
          ? {
              ...result.toObject(),
              vAvatar: user.vAvatar,
              xp: user.xp,
              dXp: user.dXp,
            }
          : result.toObject();
      });

      res.status(200).json(combinedData);
    } else {
      res.status(200).json([]);
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

const adminUpdateResult = async (req, res) => {
  const { username } = req.body;
  try {
    const existResult = await ResultModel.find({ username });
    if (!existResult) return res.status(404).json("Could not find result!");
    const newResult = await ResultModel.findOneAndUpdate(
      {
        username: req.body.username,
        email: req.body.email,
      },
      {
        master26: req.body.master26,
        highFinish: req.body.highFinish,
        friendlyChallenger: req.body.friendlyChallenger,
        currentVictoryStreak: req.body.currentVictoryStreak,
        seasonCurrentVictoryStreak: req.body.seasonCurrentVictoryStreak,
        maxVictoryStreak: req.body.maxVictoryStreak,
        seasonMaxVictoryStreak: req.body.seasonMaxVictoryStreak,
        totalWinNo: req.body.totalWinNo,
        pyramidClimber: req.body.pyramidClimber,
        monthlyMaestro: req.body.monthlyMaestro,
        challengeConqueror: req.body.challengeConqueror,
        pyramidProtector: req.body.pyramidProtector,
        legendaryRivalry: req.body.legendaryRivalry,
        previousWin: req.body.previousWin,
        ironDart: req.body.ironDart,
        master180: req.body.master180,
        consistentScorer: req.body.consistentScorer,
        grandMaster: req.body.grandMaster,
        maxMarksman: req.body.maxMarksman,
        dartEnthusiast: req.body.dartEnthusiast,
        readyForIt: req.body.readyForIt,
        championChallenger: req.body.championChallenger,
        level: req.body.level,
        date: req.body.date,
        summary: req.body.summary,
      },
      { new: true, runValidators: true }
    );

    if (req.body.level === 6) {
      const season = await SeasonModel.findOne().sort({ season: -1 });
      if (season) {
        const topMembers = season.topMembers;
        const index = topMembers.findIndex((val) => val.equals(newResult._id));
        if (index === -1) {
          topMembers.push(newResult._id);
          await SeasonModel.findByIdAndUpdate(season._id, {
            topMembers,
          });
        }
      }
    } else {
      const season = await SeasonModel.findOne().sort({ season: -1 });

      if (season) {
        const topMembers = season.topMembers;
        const index = topMembers.findIndex((val) => val.equals(newResult._id));
        if (index !== -1) {
          topMembers.splice(index, 1);

          await SeasonModel.findByIdAndUpdate(season._id, {
            topMembers,
          });
        }
      }
    }

    res.status(200).json("Success!");
    console.log("success-->>>");
  } catch (e) {
    res.status(422).json(e);
  }
};

const postResult = async (req, res) => {
  const { data, token, type = "quick" } = req.body;
  const { username } = data;
  try {
    const existResult = await ResultModel.find({ username });
    if (!existResult) return res.status(404).json("Could not find result!");

    const schedules = await ScheduleModel.find({
      $or: [{ receiver: username }, { challenger: username }],
    });

    console.log(
      "-token-->>",
      schedules,
      "-->>>",
      existResult[0].quickToken,
      "==type-->>",
      type
    );

    if (type === "quick" || type === "top-quick") {
      if (existResult[0].quickToken !== token) {
        return res.status(400).json("Invalid token!");
      }
    } else {
      if (isEmpty(schedules)) {
        return res.status(400).json("No schedule found!");
      }

      let isValid = false;

      schedules.forEach(async (schedule) => {
        if (schedule.token === token) {
          isValid = true;
          return;
        }
      });

      if (!isValid) {
        return res.status(400).json("Invalid token!");
      }
    }

    const newResult = await ResultModel.findOneAndUpdate(
      {
        username: data.username,
        email: data.email,
      },
      {
        master26: data.master26,
        highFinish: data.highFinish,
        friendlyChallenger: data.friendlyChallenger,
        currentVictoryStreak: data.currentVictoryStreak,
        seasonCurrentVictoryStreak: data.seasonCurrentVictoryStreak,
        maxVictoryStreak: data.maxVictoryStreak,
        seasonMaxVictoryStreak: data.seasonMaxVictoryStreak,
        totalWinNo: data.totalWinNo,
        pyramidClimber: data.pyramidClimber,
        monthlyMaestro: data.monthlyMaestro,
        challengeConqueror: data.challengeConqueror,
        pyramidProtector: data.pyramidProtector,
        legendaryRivalry: data.legendaryRivalry,
        previousWin: data.previousWin,
        ironDart: data.ironDart,
        master180: data.master180,
        consistentScorer: data.consistentScorer,
        grandMaster: data.grandMaster,
        maxMarksman: data.maxMarksman,
        dartEnthusiast: data.dartEnthusiast,
        readyForIt: data.readyForIt,
        throwCount: data.throwCount,
        championChallenger: data.championChallenger,
        level: type === "quick" ? data.level : existResult[0].level,
        date: data.date,
        summary: data.summary,
        isCheckout: data.isCheckout,
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
      if (data.level === 6) {
        const season = await SeasonModel.findOne().sort({ season: -1 });
        if (season) {
          const topMembers = season.topMembers;
          const index = topMembers.findIndex((val) =>
            val.equals(newResult._id)
          );
          if (index === -1) {
            topMembers.push(newResult._id);
            await SeasonModel.findByIdAndUpdate(season._id, {
              topMembers,
            });
          }
        }
      } else {
        const season = await SeasonModel.findOne().sort({ season: -1 });

        if (season) {
          const topMembers = season.topMembers;
          const index = topMembers.findIndex((val) =>
            val.equals(newResult._id)
          );
          if (index !== -1) {
            topMembers.splice(index, 1);

            await SeasonModel.findByIdAndUpdate(season._id, {
              topMembers,
            });
          }
        }
      }
    }

    if (type === "schedule") {
      schedules.forEach(async (schedule) => {
        if (schedule.token === token)
          await ScheduleModel.findByIdAndDelete(schedule._id);
      });
    }

    res.status(200).json("Success!");
    console.log("success");
  } catch (e) {
    res.status(422).json(e);
  }

  console.log("Result-Req-->>", req.body);
};

const getUpdatedAchievements = (initial, updated) => {
  const updatedAchievements = {};
  for (const key in initial) {
    if (initial[key] !== updated[key]) {
      updatedAchievements[key] = {
        initial: initial[key],
        updated: updated[key],
      };
    }
  }
  return updatedAchievements;
};

const updateAchievements = async (data) => {
  try {
    const player1Result = await ResultModel.findOne({ username: data.p1.name });
    const player2Result = await ResultModel.findOne({ username: data.p2.name });

    if (!player1Result || !player2Result) {
      throw new Error("Player results not found");
    }

    const initialAchievements = {
      player1: { ...player1Result.toObject() },
      player2: { ...player2Result.toObject() },
    };

    const availablePositionNo = Math.pow(2, 7 - player1Result.level);
    const currentAbovePlayersNo = await ResultModel.countDocuments({
      level: player1Result.level + 1,
    });
    const rowSpotNo = availablePositionNo - currentAbovePlayersNo;

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
    const { user: player1MaxStreaks, opponent: player2MaxStreaks } =
      updateMaxStreaks(data.p1, data.p2, player1Result, player2Result);

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
          ...player1MaxStreaks,
          ...updateFriendlyChallenger(player1Result),
          ...updateChampionChallenger(player2Result),
          ...updateConsistentScorer(data.p1, player1Result),
          ...updateMaster26(data.p1, player1Result),
          ...updateThrowCount(data.p1, player1Result),
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
          ...player2MaxStreaks,
          ...updateReadyForIt(player2Result),
          ...updateChallengeConqueror(data.p1, data.p2, player2Result),
          ...updateConsistentScorer(data.p2, player2Result),
          ...updateMaster26(data.p2, player2Result),
          ...updateThrowCount(data.p2, player2Result),
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

    const [finalUser, finalOpponent] = await Promise.all([
      ResultModel.findByIdAndUpdate(player1Result._id, {
        ...player1PyramidClimber,
        ...updateMonthlyMaestro(player1Result, updatedUser),
        ...updateSummary(data.date, data.p1, updatedUser, player1Result),
      }),
      ResultModel.findByIdAndUpdate(player2Result._id, {
        ...player2PyramidClimber,
        ...updateMonthlyMaestro(player2Result, updatedOpponent),
        ...updateSummary(data.date, data.p2, updatedOpponent, player2Result),
      }),
    ]);

    const updatedAchievementsList = {
      player1: getUpdatedAchievements(initialAchievements.player1, finalUser),
      player2: getUpdatedAchievements(
        initialAchievements.player2,
        finalOpponent
      ),
    };

    console.log("Updated Achievements:", updatedAchievementsList);
  } catch (err) {
    console.log("update-achievements-err-->>>", err);
  }
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
  getResult,
  postResult,
  getSubResult,
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
};

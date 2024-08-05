const puppeteer = require("puppeteer");
const ResultModel = require("../models/result.model");
const EventModel = require("../models/events.model");
const SeasonModel = require("../models/season.model");
const GlobalCoinModel = require("../models/globalCoin.model");
const axios = require("axios");

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

    const user1InitResult = allResult.find((val) =>
      val.username.trim().toLowerCase().includes(p1_name.toLowerCase())
    );

    const user2InitResult = allResult.find((val) =>
      val.username.trim().toLowerCase().includes(p2_name.toLowerCase())
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
    const result = await ResultModel.find();
    res.status(200).json(result);
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
  const { data, token } = req.body;
  const { username } = data;
  try {
    const existResult = await ResultModel.find({ username });
    if (!existResult) return res.status(404).json("Could not find result!");

    console.log('-token-->>', token, '-->>>', existResult[0].quickToken);

    if (existResult.quickToken !== token) {
      return res.status(400).json("Invalid token!");
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
        championChallenger: data.championChallenger,
        level: data.level,
        date: data.date,
        summary: data.summary,
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

    if (data.level === 6) {
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
    console.log("success");
  } catch (e) {
    res.status(422).json(e);
  }

  console.log("Result-Req-->>", req.body);
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

    // Respond with the number of documents updated
    res
      .status(200)
      .json(`${updateResult.nModified} users activated successfully!`);
  } catch (err) {
    console.log("Error in bulkActivateUsers-->>", err);
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
            breakfast: { lifetime: 0, season: 0 },
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
};

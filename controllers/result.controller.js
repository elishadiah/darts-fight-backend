const puppeteer = require("puppeteer");
const ResultModel = require("../models/result.model");
const EventModel = require("../models/events.model");
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

const postResult = async (req, res) => {
  const { username } = req.body;
  try {
    const existResult = await ResultModel.find({ username });
    if (!existResult) return res.status(404).json("Could not find result!");
    await ResultModel.findOneAndUpdate(
      {
        username: req.body.username,
        email: req.body.email,
      },
      {
        master26: req.body.master26,
        highFinish: req.body.highFinish,
        sentMonthChallengeNo: req.body.sentMonthChallengeNo,
        sentWeekChallengeNo: req.body.sentWeekChallengeNo,
        sentTotalChallengeNo: req.body.sentTotalChallengeNo,
        acceptMonthChallengeNo: req.body.acceptMonthChallengeNo,
        acceptWeekChallengeNo: req.body.acceptWeekChallengeNo,
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

    await EventModel.create({
      eventType: "match",
      user: req.body.username,
      targetUser: req.body.targetUser,
      match: {
        link: req.body.link,
        user1Won: req.body.won,
        user2Won: req.body.targetWon,
        achievements: req.body.earnedAchievements,
      },
    });

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

const addField = async (req, res) => {
  try {
    await ResultModel.updateMany({}, [{ $set: { active: true } }], {
      upsert: false,
    });
    res.status(200).json("Add success!");
  } catch (err) {
    console.log("Aggregate-->>", err);
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
};

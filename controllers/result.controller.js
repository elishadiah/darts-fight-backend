const puppeteer = require("puppeteer");
const ResultModel = require("../models/result.model");
const axios = require("axios");

getSubResult = (req, res) => {
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

const getHighFinish = (firstArray, secondArray) => {
  const counts = [];

  // Create a map to store the counts of elements in the first array
  const map = new Map();
  for (const num of firstArray) {
    if (map.has(num)) {
      map.set(num, map.get(num) + 1);
    } else {
      map.set(num, 1);
    }
  }

  // Count the occurrences of elements from the second array
  for (const num of secondArray) {
    counts.push(map.get(num) || 0);
  }

  return counts;
};

const isEmpty = (data) => {
  if (data.length === 0 || data === null || data === undefined) return true;
  else return false;
};

getResult = (req, res) => {
  let allResult = [],
    user1,
    user2;
  ResultModel.find()
    .then((result) => {
      allResult = result;
      axios
        .get(req.query.params.url)
        .then((response) => {
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
          // console.log("WWWW--->>", response.data);

          const user1InitResult = allResult.find((val) =>
            val.username.includes(p1_name)
          );
          const user2InitResult = allResult.find((val) =>
            val.username.includes(p2_name)
          );

          user1 = {
            name: p1_name,
            won: p1_legs_won,
            avg: p1_match_avg,
            // breakfast: cntBreakfast1,
            init: user1InitResult,
          };

          user2 = {
            name: p2_name,
            won: p2_legs_won,
            avg: p2_match_avg,
            // breakfast: cntBreakfast2,
            init: user2InitResult,
          };

          if (isEmpty(user1InitResult) || isEmpty(user2InitResult))
            res.status(404).json("User not found");

          res
            .status(200)
            .json({
              user1,
              user2,
              begin,
              end,
              allResult,
              result: JSON.parse(match_json)[1],
            });
        })
        .catch((error) => {
          res.status(500).json(error);
        });
    })
    .catch((err) => res.status(404).json("User not found"));
};

fetchResult = async (req, res) => {
  const { username } = req.body;
  try {
    const existResult = await ResultModel.findOne({ username });
    if (existResult) res.status(200).json(existResult);
    else res.status(404).json("There is no result for this user.");
  } catch (err) {
    res.status(500).json(err);
  }
};

fetchAllResult = async (req, res) => {
  try {
    const result = await ResultModel.find();
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json(err);
  }
};

postResult = async (req, res) => {
  const { username } = req.body;
  try {
    const existResult = ResultModel.find({ username });
    if (!existResult) res.status(404).json("Could not find result!");
    else {
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
          acceptMonthChallengeNo: req.body.acceptMonthChallengeNo,
          acceptWeekChallengeNo: req.body.acceptWeekChallengeNo,
          currentVictoryStreak: req.body.currentVictoryStreak,
          maxVictoryStreak: req.body.maxVictoryStreak,
          totalWinNo: req.body.totalWinNo,
          level: req.body.level,
        },
        { new: true, runValidators: true }
      );
    }
    res.status(200).json("Success!");
    console.log("success");
  } catch (e) {
    res.status(422).json(e);
  }

  console.log("Result-Req-->>", req.body);
};

module.exports = {
  getResult,
  postResult,
  getSubResult,
  fetchResult,
  fetchAllResult,
};

const puppeteer = require("puppeteer");
const ResultModel = require("../models/result.model");

getSubResult = (req, res) => {
  const { url } = req.body;
  console.log("-----SUB--RESULT-----");
  puppeteer
    .launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      browserContext: "default",
      executablePath: '/usr/bin/chromium-browser'
    })
    .then(async (browser) => {
      const page = await browser.newPage();
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

getResult = (req, res) => {
  const destUrl = req.body.url;
  puppeteer
    .launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      browserContext: "default",
      executablePath: '/usr/bin/chromium-browser'
    })
    .then(async (browser) => {
      const page = await browser.newPage();
      await page.goto(destUrl, { waitUntil: "load", timeout: 0 });

      let totalResult, allResult, userResult;

      try {
        await page.waitForSelector(
          ".container-fluid div .card .card-body div.col-3 > h3"
        );

        totalResult = await page.evaluate(() => {
          const fruitsList = document.body.querySelectorAll(
            ".container-fluid div .card .card-body div.col-3 > h3"
          );

          let fruits = [];

          fruitsList.forEach((value) => {
            fruits.push(value.innerText);
          });
          return fruits;
        });
      } catch (e) {
        console.log("total-err-->>", e);
        res.status(500).json(e);
      }

      try {
        await page.waitForSelector(".container-fluid div .card .card-body p");

        allResult = await page.evaluate(() => {
          const fruitsList = document.body.querySelectorAll(
            ".container-fluid div .card .card-body p"
          );

          let fruits = [];

          fruitsList.forEach((value) => {
            fruits.push(value.innerText);
          });
          return fruits;
        });
      } catch (e) {
        console.log("all-err-->>", e);
        res.status(500).json(e);
      }

      try {
        await page.waitForSelector(
          ".container-fluid div .card .card-body h1 a"
        );

        userResult = await page.evaluate(() => {
          const userList = document.body.querySelectorAll(
            ".container-fluid div .card .card-body h1 a"
          );

          let users = [];

          userList.forEach((value) => {
            users.push(value.innerText);
          });
          return users;
        });
      } catch (e) {
        console.log("user-err-->>", e);
        res.status(500).json(e);
      }

      res.json({ allResult, totalResult, userResult });

      await browser.close();
    })
    .catch(function (err) {
      res.status(500).json(err);
      console.log("Browser-err-->>>", err);
    });
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

module.exports = { getResult, postResult, getSubResult, fetchResult, fetchAllResult };

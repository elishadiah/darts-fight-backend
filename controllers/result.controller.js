const puppeteer = require("puppeteer");

getResult = (req, res) => {
    const destUrl = req.body.url;
  puppeteer
    .launch()
    .then(async (browser) => {
      const page = await browser.newPage();
      await page.goto(destUrl);
      // await page.goto("https://cra-crawl.vercel.app/")

      // await page.waitForSelector(".container-fluid");

      let totalResult = await page.evaluate(() => {
        const fruitsList = document.body.querySelectorAll(
          ".container-fluid div .card .card-body div.col-3 > h3"
        );

        let fruits = [];

        fruitsList.forEach((value) => {
          fruits.push(value.innerText);
        });
        return fruits;
      });

      let allResult = await page.evaluate(() => {
        const fruitsList = document.body.querySelectorAll(
          ".container-fluid div .card .card-body p"
        );

        let fruits = [];

        fruitsList.forEach((value) => {
          fruits.push(value.innerText);
        });
        return fruits;
      });

      res.json({ allResult, totalResult });

      await browser.close();
    })
    .catch(function (err) {
      console.log("Browser-err-->>>", err);
    });
};

module.exports = { getResult };

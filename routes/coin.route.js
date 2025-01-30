const express = require("express");
const {
  saveCoinPurchase,
  getCoinPurchases,
} = require("../controllers/coin.controller");

const router = express.Router();

router.post("/save", saveCoinPurchase);
router.get("/get", getCoinPurchases);

module.exports = router;

const express = require("express");

const {
  getMatchStatus,
  updateDouble,
  updateBullScoreApi,
} = require("../controllers/score.controller.js");

const router = express.Router();

router.get("/get/match-status/:token", getMatchStatus);
router.post("/update/double", updateDouble);
router.post("/update/bull-score", updateBullScoreApi);

module.exports = router;

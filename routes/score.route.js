const express = require("express");

const {
  getMatchStatus,
  updateBullScoreApi,
  getOpenGamesApi,
  getMyOpenGamesApi,
} = require("../controllers/score.controller.js");

const router = express.Router();

router.get("/get/match-status/:token", getMatchStatus);
router.get("/get/open-games", getOpenGamesApi);
router.get("/get/open-games/:username", getMyOpenGamesApi);
router.post("/update/bull-score", updateBullScoreApi);

module.exports = router;

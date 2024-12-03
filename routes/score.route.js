const express = require("express");

const { getMatchStatus } = require("../controllers/score.controller.js");

const router = express.Router();

router.get("/get/match-status/:token", getMatchStatus);

module.exports = router;

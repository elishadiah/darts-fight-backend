const express = require("express");

const { getMatchStatus, updateDouble } = require("../controllers/score.controller.js");

const router = express.Router();

router.get("/get/match-status/:token", getMatchStatus);
router.post("/update/double", updateDouble);

module.exports = router;

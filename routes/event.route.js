const express = require("express");
const {
  postEvent,
  getEvent,
  findLastMatch,
  mostFights,
  getFightsPerDayInMonth,
} = require("../controllers/event.controller.js");

const router = express.Router();

router.post("/post", postEvent);
router.get("/get", getEvent);
router.get("/last-match/:userName", findLastMatch);
router.get("/most-fights", mostFights);
router.get("/fights-per-day-in-month", getFightsPerDayInMonth);

module.exports = router;

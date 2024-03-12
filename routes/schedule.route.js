const express = require("express");

const { saveSchedule, fetchAllSchedule, removeSchedule } = require("../controllers/schedule.controller.js");

const router = express.Router();

router.post("/save", saveSchedule);
router.post("/remove", removeSchedule);
router.get("/fetch-all", fetchAllSchedule);

module.exports = router;

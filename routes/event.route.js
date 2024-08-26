const express = require("express");
const { postEvent, getEvent, findLastMatch } = require("../controllers/event.controller.js");

const router = express.Router();

router.post("/post", postEvent);
router.get("/get", getEvent);
router.get("/last-match/:userName", findLastMatch);

module.exports = router;

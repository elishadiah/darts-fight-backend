const express = require("express");
const { postEvent, getEvent } = require("../controllers/event.controller.js");

const router = express.Router();

router.post("/post", postEvent);
router.get("/get", getEvent);

module.exports = router;

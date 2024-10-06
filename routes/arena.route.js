const express = require("express");
const {
  createArena,
  getArenas,
  getJoinedUsersByTitle,
  startArenaMatch,
  resetArena,
  getMatchResultsByTitle,
  getArenaByTitle,
} = require("../controllers/arena.controller.js");

const router = express.Router();

router.post("/create", createArena);
router.get("/", getArenas);
router.get("/:title/users", getJoinedUsersByTitle);
router.post("/match/:title/:username", startArenaMatch);
router.get("/reset/:title", resetArena);
router.get("/get/:title", getArenaByTitle);
router.get("/get/results/:title", getMatchResultsByTitle);

module.exports = router;

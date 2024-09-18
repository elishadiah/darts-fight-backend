const express = require("express");
const {
  createArena,
  getArenas,
  getJoinedUsersByTitle,
  startArenaMatch,
  resetArena,
} = require("../controllers/arena.controller.js");

const router = express.Router();

router.post("/create", createArena);
router.get("/", getArenas);
router.get("/:title", getJoinedUsersByTitle);
router.get("/match/:title/:username", startArenaMatch);
router.get("/reset/:title", resetArena);

module.exports = router;

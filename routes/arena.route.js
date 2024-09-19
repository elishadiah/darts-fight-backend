const express = require("express");
const {
  createArena,
  getArenas,
  getJoinedUsersByTitle,
  startArenaMatch,
  resetArena,
  getArenaByTitle,
} = require("../controllers/arena.controller.js");

const router = express.Router();

router.post("/create", createArena);
router.get("/", getArenas);
router.get("/:title/users", getJoinedUsersByTitle);
router.get("/match/:title/:username", startArenaMatch);
router.get("/reset/:title", resetArena);
router.get("/get/:title", getArenaByTitle);

module.exports = router;

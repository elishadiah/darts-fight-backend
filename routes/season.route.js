const express = require("express");

const { saveSeason, adminSeason, getAllSeasons } = require("../controllers/season.controller.js");

const router = express.Router();

router.post("/save", saveSeason);
router.get("/get-all", getAllSeasons);
router.post("/admin-save", adminSeason);

module.exports = router;

const express = require("express");
const { createCommunity, getCommunity } = require("../controllers/community.controller");

const router = express.Router();

router.post("/create", createCommunity);
router.get("/get", getCommunity);

module.exports = router;

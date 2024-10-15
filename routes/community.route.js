const express = require("express");
const { createCommunity } = require("../controllers/community.controller");

const router = express.Router();

router.post("/create", createCommunity);

module.exports = router;

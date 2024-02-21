const express = require("express");
const {
  getResult,
} = require("../controllers/result.controller.js");

const router = express.Router();

router.post("/get", getResult);

module.exports = router;

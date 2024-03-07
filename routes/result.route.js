const express = require("express");
const {
  getResult,
  postResult,
  getSubResult,
  fetchResult,
  fetchAllResult
} = require("../controllers/result.controller.js");

const router = express.Router();

router.post("/detail", getSubResult);
router.post("/get", getResult);
router.post('/post', postResult);
router.post('/fetch', fetchResult);
router.get('/fetch-all', fetchAllResult);

module.exports = router;

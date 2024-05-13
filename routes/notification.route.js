const express = require("express");
const {
  postNotification,
} = require("../controllers/notification.controller.js");

const router = express.Router();

router.post("/post", postNotification);

module.exports = router;

const express = require("express");
const {
  loginUser,
  registerUser,
  fetchUser,
  updateUser
} = require("../controllers/auth.controller.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/update/:id", updateUser);
router.get("/get", fetchUser);

module.exports = router;

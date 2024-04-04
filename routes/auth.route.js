const express = require("express");
const {
  loginUser,
  loginAdminUser,
  registerUser,
  fetchUser,
  updateUser,
  addField
} = require("../controllers/auth.controller.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin-login", loginAdminUser);
router.post("/update/:id", updateUser);
router.get("/get", fetchUser);
router.post("/add-field", addField);

module.exports = router;

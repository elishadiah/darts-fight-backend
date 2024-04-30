const express = require("express");
const {
  loginUser,
  loginAdminUser,
  registerUser,
  fetchUser,
  updateUser,
  addField,
  resetLink,
  resetPassword,
  changePassword,
  updateProfile,
  getProfile
} = require("../controllers/auth.controller.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin-login", loginAdminUser);
router.post("/update/:id", updateUser);
router.post("/change-password/:id", changePassword);
router.get("/get/:id", fetchUser);
router.post("/add-field", addField);
router.post("/reset-password", resetLink);
router.post("/retype-password", resetPassword);
router.post("/update-profile/:id", updateProfile);
router.get("/get-profile/:id", getProfile);

module.exports = router;

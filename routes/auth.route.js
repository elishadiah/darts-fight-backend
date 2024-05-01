const express = require("express");
const {
  loginUser,
  loginAdminUser,
  registerUser,
  getUserById,
  updateUser,
  addField,
  resetLink,
  resetPassword,
  changePassword,
  updateProfile,
  getProfileByID,
  getUserByUsername,
} = require("../controllers/auth.controller.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin-login", loginAdminUser);
router.post("/update/:id", updateUser);
router.post("/change-password/:id", changePassword);
router.get("/get/:id", getUserById);
router.post("/add-field", addField);
router.post("/reset-password", resetLink);
router.post("/retype-password", resetPassword);
router.post("/update-profile/:id", updateProfile);
router.get("/get-profile/:id", getProfileByID);
router.get("/get-user/:username", getUserByUsername);

module.exports = router;

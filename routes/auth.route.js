const express = require("express");
const {
  loginUser,
  loginAdminUser,
  registerUser,
  logoutUser,
  getUserById,
  updateUser,
  addField,
  resetLink,
  resetPassword,
  changePassword,
  updateProfile,
  getProfileByID,
  getUserByUsername,
  getAllUsers,
  userApprove,
  updateLastLoginDate,
  getLastLoginDate,
  getGlobalCoin,
  updateGlobalCoin,
  updateBalance,
  getBalance,
} = require("../controllers/auth.controller.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/admin-login", loginAdminUser);
router.post("/logout", logoutUser);
router.post("/update/:id", updateUser);
router.post("/change-password/:id", changePassword);
router.get("/get/:id", getUserById);
router.post("/add-field", addField);
router.post("/reset-password", resetLink);
router.post("/retype-password", resetPassword);
router.post("/update-profile/:id", updateProfile);
router.get("/get-profile/:id", getProfileByID);
router.get("/get-user/:username", getUserByUsername);
router.get("/get-users", getAllUsers);
router.post("/approve-user/:id", userApprove);
router.post("/update-last-login-date", updateLastLoginDate);
router.get('/get-last-login-date/:username', getLastLoginDate);
router.get('/get-global-coin', getGlobalCoin);
router.post('/update-global-coin', updateGlobalCoin);
router.post('/update-balance/:id', updateBalance);
router.get('/get-balance/:id', getBalance);

module.exports = router;

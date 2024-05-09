const UserModel = require("../models/user.model.js");
const ResultModel = require("../models/result.model.js");
const EventModel = require("../models/events.model.js");
const TokenModel = require("../models/token.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmailNotification } = require("../email.js");

// Register new user
const registerUser = async (req, res) => {
  const { username, email, avatar, password } = req.body;

  try {
    const existingUser = await UserModel.findOne({ username: username.trim() });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    const newUser = new UserModel({
      username: username.trim(),
      email: email.trim(),
      avatar,
      password: hashedPass,
    });

    const savedUser = await newUser.save();

    await ResultModel.create({
      username: savedUser.username,
      email: savedUser.email,
      avatar: savedUser.avatar,
    });

    const token = jwt.sign(
      { username: savedUser.username, id: savedUser._id },
      "my-32-character-ultra-secure-and-ultra-long-secret",
      { expiresIn: "1h" }
    );

    await EventModel.create({
      eventType: "register",
      user: savedUser.username,
    });

    res.status(200).json({ user: savedUser, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await UserModel.find();

    const user = users.find((val) =>
      val.email.trim().toLowerCase().includes(email.trim().toLowerCase())
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json("wrong password");
    }

    const token = jwt.sign(
      { email: user.email, id: user._id },
      "my-32-character-ultra-secure-and-ultra-long-secret",
      { expiresIn: "6h" }
    );

    user.lastLoginDate = new Date();
    await user.save();

    await EventModel.create({
      eventType: "login",
      user: user.username,
    });

    res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Login Admin User
const loginAdminUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const users = await UserModel.find();
    const user = users.find((val) =>
      val.email.trim().toLowerCase().includes(email.trim().toLowerCase())
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.userRole) {
      return res.status(400).json({ message: "Non-admin user" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(400).json("wrong password");
    }

    const token = jwt.sign(
      { email: user.email, id: user._id, role: user.userRole },
      "my-32-character-ultra-secure-and-ultra-long-secret",
      { expiresIn: "6h" }
    );

    res.status(200).json({ user, token });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Logout User
const logoutUser = async (req, res) => {
  const { username } = req.body;
  try {
    await EventModel.create({
      eventType: "logout",
      user: username,
    });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Update Profile
const updateUser = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json("There is no ID");
    const currentUser = await UserModel.findById(req.params.id);

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.params.id,
      {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        username: req.body.username,
        avatar: req.body.avatar,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    await ResultModel.findOneAndUpdate(
      { username: currentUser.username },
      {
        username: req.body.username,
        avatar: req.body.avatar,
        email: req.body.email,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: "Success",
      data: {
        updatedUser,
      },
    });
  } catch (err) {
    console.log("update-user-err-->>>", err);
    res.status(500).json(err);
  }
};

// password change
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!req.params.id) return res.status(400).json("There is no ID");

    const user = await UserModel.findById(req.params.id);

    if (!user) return res.status(404).json("Not found user");

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isValidPassword) return res.status(400).json("wrong password");

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(newPassword, salt);

    await UserModel.findByIdAndUpdate(
      user._id,
      {
        password: hashedPass,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).send("Password changed sucessfully.");
  } catch (err) {
    console.log("change-password-err-->>>", err);
    res.status(500).json(err);
  }
};

const updateProfile = async (req, res) => {
  const { profile } = req.body;

  try {
    if (!req.params.id) return res.status(400).json("There is no ID");

    await UserModel.findByIdAndUpdate(
      req.params.id,
      { profile },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json("Profile updated successfully!");
  } catch (err) {
    console.log("update-profile-err-->>>", err);
    res.status(500).json(err);
  }
};

const getProfileByID = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json("There is no ID");

    const user = await UserModel.findById(req.params.id);

    if (!user) return res.status(404).json("User not found");

    res.status(200).json({ profile: user.profile });
  } catch (err) {
    console.log("get-profile-err-->>>", err);
    res.status(500).json(err);
  }
};

const getUserByUsername = async (req, res) => {
  try {
    if (!req.params.username)
      return res.status(400).json("There is no username");

    const users = await UserModel.find();

    const user = users.find(
      (val) =>
        val.username.toLowerCase() === req.params.username.trim().toLowerCase()
    );

    if (!user) return res.status(404).json("User not found");

    res.status(200).json(user);
  } catch (err) {
    console.log("get-profile-err-->>>", err);
    res.status(500).json(err);
  }
};

// Get User by ID
const getUserById = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) return res.status(404).json("User not found");

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json(err);
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find();

    if (!users) return res.status(404).json("Users not found");

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
};

const addField = async (req, res) => {
  try {
    await UserModel.updateMany({}, [{ $set: { lastLoginDate: new Date() } }], {
      upsert: false,
    });
    res.status(200).json("Add success!");
  } catch (err) {
    console.log("Aggregate-->>", err);
    res.status(422).json(err);
  }
};

const resetLink = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user)
      return res.status(404).send("User with given email doesn't exist");

    let token = await TokenModel.findOne({ userId: user._id });

    if (!token) {
      token = await new TokenModel({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();
    }

    // const BASE_URL = "http://localhost:3000";
    const BASE_URL = "https://octopus-app-jk7w6.ondigitalocean.app";
    const link = `${BASE_URL}/retype-password/${user._id}/${token.token}`;

    await sendEmailNotification(
      user.username,
      user.email,
      "Fight Club",
      "fightclub@gmail.com",
      link,
      "Password Reset"
    );

    res.status(200).send("password reset link sent to your email account");
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const user = await UserModel.findById(req.body.userId);
    if (!user) return res.status(400).send("invalid link or expired");

    const token = await TokenModel.findOne({
      userId: user._id,
      token: req.body.token,
    });
    if (!token) return res.status(400).send("Invalid link or expired");

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(req.body.password, salt);

    await UserModel.findByIdAndUpdate(
      user._id,
      {
        password: hashedPass,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    await TokenModel.findByIdAndDelete(token._id);

    res.status(200).send("password reset sucessfully.");
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

module.exports = {
  loginUser,
  loginAdminUser,
  registerUser,
  logoutUser,
  updateUser,
  changePassword,
  addField,
  resetLink,
  resetPassword,
  updateProfile,
  getProfileByID,
  getUserById,
  getUserByUsername,
  getAllUsers
};

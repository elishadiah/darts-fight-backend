const UserModel = require("../models/user.model.js");
const ResultModel = require("../models/result.model.js");
const EventModel = require("../models/events.model.js");
const TokenModel = require("../models/token.model.js");
const GlobalCoinModel = require("../models/globalCoin.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmailNotification } = require("../email.js");

const rankThresholds = [500, 1500, 3000, 6000, 10000, 15000];
const rankBonuses = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3];

const vAvatars = [
  {
    title: "Virtual Avatar 01",
    ranks: 1,
    xp: 500,
    img: "RANKAVATAR1",
    scoring: 30,
    checkout: 0.5,
    edge: 0,
    bullseye: 0.5,
  },
  {
    title: "Virtual Avatar 02",
    ranks: 2,
    xp: 1500,
    img: "RANKAVATAR2",
    scoring: 50,
    checkout: 1,
    edge: 0.5,
    bullseye: 1,
  },
  {
    title: "Virtual Avatar 03",
    ranks: 3,
    xp: 3000,
    img: "RANKAVATAR3",
    scoring: 70,
    checkout: 1.5,
    edge: 1,
    bullseye: 1.5,
  },
  {
    title: "Virtual Avatar 04",
    ranks: 4,
    xp: 6000,
    img: "RANKAVATAR4",
    scoring: 90,
    checkout: 2,
    edge: 1.5,
    bullseye: 2,
  },
  {
    title: "Virtual Avatar 05",
    ranks: 5,
    xp: 10000,
    img: "RANKAVATAR5",
    scoring: 110,
    checkout: 2.5,
    edge: 2,
    bullseye: 2.5,
  },
  {
    title: "Virtual Avatar 06",
    ranks: 6,
    xp: 15000,
    img: "RANKAVATAR6",
    scoring: 130,
    checkout: 3,
    edge: 2.5,
    bullseye: 3,
  },
];

const updateXPAndRank = async (userId, xpToAdd) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  const bonus = rankBonuses[user.rank] || 0;
  user.xp += Number(xpToAdd) * (1 + bonus);

  console.log("user.xp-->>>", user.xp, '-->>>', xpToAdd, '-->>', bonus);

  let newRank = user.rank;
  for (let i = rankThresholds.length - 1; i >= 0; i--) {
    if (user.xp >= rankThresholds[i]) {
      newRank = i + 1;
      break;
    }
  }

  if (newRank > user.rank) {
    user.rank = newRank;
    user.vAvatar = {...vAvatars[user.rank - 1], isLocked: false, isSelected: true};
  }

  await user.save();
  return user;
};

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
      return res.status(404).json("User not found");
    }

    if (!user.flowliga) {
      return res
        .status(400)
        .json("Your registration request has not been approved yet.");
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

    if (user.isFirstLogin) {
      await updateXPAndRank(user._id, 10);
      user.isFirstLogin = false;
      await user.save();
    }

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
        discord: req.body.discord,
        twitter: req.body.twitter,
        facebook: req.body.facebook,
        instagram: req.body.instagram,
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

  console.log("profile-->>>", profile, req.body);

  try {
    if (!req.params.id) return res.status(400).json("There is no ID");

    const newUser = await UserModel.findByIdAndUpdate(
      req.params.id,
      { profile },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json(newUser?.profile);
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

    res.status(200).json({ users });
  } catch (err) {
    res.status(500).json(err);
  }
};

const addField = async (req, res) => {
  try {
    await UserModel.updateMany(
      {},
      [
        {
          $set: {
            vAvatar: {
              title: "",
              ranks: 0,
              xp: 0,
              img: "",
              scoring: 20,
              checkout: 0.2,
              edge: 0,
              bullseye: 0.1,
              isLocked: false,
              isSelected: true,
            },
          },
        },
      ],
      {
        upsert: false,
      }
    );
    res.status(200).json("Add success!");

    // const updateUsers = await UserModel.updateMany(
    //   {},
    //   { $unset: { socials: [] } }
    // );

    // res.status(200).json(updateUsers.modifiedCount + " document(s) deleted.");
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
    const BASE_URL = "https://dartsfightclub.de";
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

const userApprove = async (req, res) => {
  try {
    const { id } = req.params;
    const { flowliga } = req.body;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).send("User not found");

    await UserModel.findByIdAndUpdate(
      id,
      {
        flowliga: flowliga,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).send("User approved successfully.");

    // await EventModel.create({
    //   eventType: "approve",
    //   user: user.username,
    // });
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const updateLastLoginDate = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await UserModel.findOne({
      username: username,
    });
    if (!user) return res.status(404).send("User not found");

    await UserModel.findByIdAndUpdate(
      user._id,
      {
        lastLoginDate: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).send("Last login date updated successfully.");
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const getLastLoginDate = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await UserModel.findOne({
      username: username,
    });
    if (!user) return res.status(404).send("User not found");

    res.status(200).send(user.lastLoginDate);
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const getGlobalCoin = async (req, res) => {
  try {
    const globalCoin = await GlobalCoinModel.findOne({});
    if (!globalCoin) return res.status(404).send("Global coin not found");

    res.status(200).send(globalCoin);
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const updateGlobalCoin = async (req, res) => {
  try {
    const { balance } = req.body;

    const updatedGlobalCoin = await GlobalCoinModel.updateMany(
      {},
      { $inc: { amount: balance } },
      {
        new: true,
        upsert: true,
      }
    );

    // Retrieve the updated value
    const globalCoin = await GlobalCoinModel.findOne({});

    res.status(200).send({
      msg: "Global coin added successfully.",
      value: globalCoin.amount,
    });
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const buyBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).send("User not found");

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      {
        $inc: { customBalance: balance },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).send({
      msg: "Balance updated successfully.",
      value: updatedUser.customBalance,
    });
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const updateBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, type } = req.body;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).send("User not found");

    if (type === "default") {
      const updatedUser = await UserModel.findByIdAndUpdate(
        user._id,
        {
          $inc: { defaultBalance: balance },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      res.status(200).send({
        msg: "Balance updated successfully.",
        value: updatedUser.defaultBalance,
        type,
      });
    } else {
      const updatedUser = await UserModel.findByIdAndUpdate(
        user._id,
        {
          $inc: { customBalance: balance },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      res.status(200).send({
        msg: "Balance updated successfully.",
        value: updatedUser.customBalance,
        type,
      });
    }
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

const getBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    if (!user) return res.status(404).send("User not found");

    res.status(200).send({
      customeBalance: user.customBalance,
      defaultBalance: user.defaultBalance,
    });
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

// Update user xp and rank
const updateUserXPAndRank = async (req, res) => {
  try {
    const { username, xpToAdd } = req.body;
    const user = await UserModel.findOne({ username: username });
    if (!user) return res.status(404).send("User not found");

    console.log("username, xpToAdd-->>>", user);

    updateXPAndRank(user._id, xpToAdd);

    res.status(200).send({
      msg: "XP and Rank updated successfully.",
    });
  } catch (error) {
    res.status(422).json(error);
    console.log(error);
  }
};

// Handle Level Up skills
const updateSkillLvl = async (req, res) => {
  try {
    const { userId, skill, requiredXp, incVal } = req.body;
    const user = await UserModel.findById(userId);

    if (!user) return res.status(404).send({ msg: "User not found" });

    if (user.xp < requiredXp)
      return res.status(400).send({ msg: "Insufficient XP to level up" });

    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      {
        $inc: { [`vAvatar.${skill}`]: incVal, xp: -requiredXp },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).send({
      updatedUser,
    });
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
  getAllUsers,
  userApprove,
  updateLastLoginDate,
  getLastLoginDate,
  getGlobalCoin,
  buyBalance,
  updateGlobalCoin,
  getBalance,
  updateBalance,
  updateXPAndRank,
  updateUserXPAndRank,
  updateSkillLvl,
};

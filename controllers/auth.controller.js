const UserModel = require("../models/user.model.js");
const ResultModel = require("../models/result.model.js");
const TokenModel = require("../models/token.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmailNotification } = require("../email.js");

// Register new user
registerUser = async (req, res) => {
  console.log("Register-->>>", req.body);
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(req.body.password, salt);
  req.body.password = hashedPass;
  const newUser = new UserModel(req.body);
  let { username, email, avatar } = req.body;
  username = username.trim();
  email = email.trim();
  try {
    const oldUser = await UserModel.findOne({ username });

    if (oldUser)
      return res.status(400).json({ message: "User already exists" });

    const user = await newUser.save();
    const token = jwt.sign(
      { username: user.username, id: user._id },
      "my-32-character-ultra-secure-and-ultra-long-secret",
      { expiresIn: "1h" }
    );
    await ResultModel.create({ username, email, avatar });
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
loginUser = async (req, res) => {
  console.log("Login-->>>", req.body);

  let { email, password } = req.body;
  email = email.trim().toLowerCase();

  try {
    const users = await UserModel.find();
    const user = users.find((val) =>
      val.email.trim().toLowerCase().includes(email)
    );
    if (user) {
      const validity = await bcrypt.compare(password, user.password);

      if (!validity) {
        res.status(400).json("wrong password");
      } else {
        const token = jwt.sign(
          { email: user.email, id: user._id },
          "my-32-character-ultra-secure-and-ultra-long-secret",
          { expiresIn: "6h" }
        );
        res.status(200).json({ user, token });
      }
    } else {
      res.status(404).json("User not found");
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

// Login Admin User
loginAdminUser = async (req, res) => {
  console.log("Login-->>>", req.body);

  let { email, password } = req.body;
  email = email.trim().toLowerCase();

  try {
    const users = await UserModel.find();
    const user = users.find((val) =>
      val.email.trim().toLowerCase().includes(email)
    );
    if (user) {
      if (user.userRole) {
        const validity = await bcrypt.compare(password, user.password);

        if (!validity) {
          res.status(400).json("wrong password");
        } else {
          const token = jwt.sign(
            { email: user.email, id: user._id, role: user.userRole },
            "my-32-character-ultra-secure-and-ultra-long-secret",
            { expiresIn: "6h" }
          );
          res.status(200).json({ user, token });
        }
      } else {
        res.status(404).json("Non-admin user");
      }
    } else {
      res.status(404).json("User not found");
    }
  } catch (err) {
    res.status(500).json(err);
  }
};

// Get User
fetchUser = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await UserModel.find();

    if (user) res.status(200).json({ user });
    else res.status(404).json("User not found");
  } catch (err) {
    res.status(500).json(err);
  }
};

// Update Profile
updateUser = async (req, res) => {
  // const salt = await bcrypt.genSalt(10);
  // const hashedPass = await bcrypt.hash(req.body.password, salt);
  // req.body.password = hashedPass;
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

  try {
    res.status(200).json({
      status: "Success",
      data: {
        updatedUser,
      },
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

addField = async (req, res) => {
  try {
    await UserModel.updateMany({}, [{ $set: { userRole: false } }], {
      upsert: false,
    });
    res.status(200).json("Add success!");
  } catch (err) {
    console.log("Aggregate-->>", err);
    res.status(422).json(err);
  }
};

resetLink = async (req, res) => {
  try {
    const user = await UserModel.findOne({ email: req.body.email });
    if (!user)
      return res.status(400).send("user with given email doesn't exist");

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

resetPassword = async (req, res) => {
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
  updateUser,
  fetchUser,
  addField,
  resetLink,
  resetPassword,
};

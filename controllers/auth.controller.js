const UserModel = require("../models/user.model.js");
const ResultModel = require("../models/result.model.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register new user
registerUser = async (req, res) => {
  console.log("Register-->>>", req.body);
  const salt = await bcrypt.genSalt(10);
  const hashedPass = await bcrypt.hash(req.body.password, salt);
  req.body.password = hashedPass;
  const newUser = new UserModel(req.body);
  const { username, email, avatar } = req.body;
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

  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email: email });

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

module.exports = { loginUser, registerUser, updateUser, fetchUser };

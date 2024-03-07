const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    firstname: {
      type: String,
      required: false,
      default: ''
    },
    lastname: {
      type: String,
      required: false,
      default: '',
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    avatar: {
      type: String, 
      required: false,
      default: ''
    }
  },
  { timestamps: true }
);

const UserModel = mongoose.model("Users", UserSchema);
module.exports = UserModel;

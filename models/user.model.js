const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    firstname: {
      type: String,
      required: false,
      default: "",
    },
    lastname: {
      type: String,
      required: false,
      default: "",
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
      default: "",
    },
    userRole: {
      type: Boolean,
      default: false,
    },
    flowliga: {
      type: Boolean,
      default: false,
    },
    profile: {
      type: String,
      default: "",
    },
    lastLoginDate: {
      type: Date,
      default: Date.now,
    },
    socials: {
      type: Array,
      default: [],
    },
    discord: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    instagram: {
      type: String,
      default: "",
    },
    facebook: {
      type: String,
      default: "",
    },
    customBalance: {
      type: Number,
      default: 0,
    },
    defaultBalance: {
      type: Number,
      default: 6,
    },
    status: {
      type: String,
      enum: ["online", "offline", "occupied"],
      default: "offline",
    },
    xp: {
      type: Number,
      default: 0,
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    rank: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// UserSchema.pre("find", function (next) {
//   if (this._conditions.username) {
//     this._conditions.username = this._conditions.username?.toLowerCase();
//   }
//   if (this._conditions.email) {
//     this._conditions.email = this._conditions.email?.toLowerCase();
//   }
//   next();
// });

const UserModel = mongoose.model("Users", UserSchema);
module.exports = UserModel;

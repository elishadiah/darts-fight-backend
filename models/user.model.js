const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const VirtualAvatarSchema = new Schema(
  {
    title: {
      type: String,
      default: "",
    },
    ranks: {
      type: Number,
      required: true,
    },
    subLvl: {
      type: Number,
    },
    xp: {
      type: Number,
      required: true,
    },
    img: {
      type: String,
      default: "",
    },
    scoring: {
      type: Number,
      default: 20,
    },
    checkout: {
      type: Number,
      default: 0.2,
    },
    edge: {
      type: Number,
      default: 0,
    },
    bullseye: {
      type: Number,
      default: 0.1,
    },
    isLocked: {
      type: Boolean,
      required: true,
    },
    isSelected: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const UserSchema = new Schema(
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
    dXp: {
      type: Number,
      default: 0,
    },
    stamina: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    isFirstLogin: {
      type: Boolean,
      default: true,
    },
    isArena: {
      type: Boolean,
      default: false,
    },
    rank: {
      type: Number,
      default: 0,
    },
    vAvatar: {
      type: VirtualAvatarSchema,
      required: false,
      default: () => ({
        title: "",
        ranks: 1,
        subLvl: 1,
        xp: 0,
        img: "",
        scoring: 10,
        checkout: 0.1,
        edge: 0,
        bullseye: 0.1,
        isLocked: false,
        isSelected: true,
      }),
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

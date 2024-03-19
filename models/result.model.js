const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ResultSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: "" },
    master26: { type: Number, default: 0 },
    highFinish: {
      type: Array,
      default: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    sentMonthChallengeNo: { type: Number, default: 0 },
    sentWeekChallengeNo: { type: Number, default: 0 },
    sentTotalChallengeNo: { type: Number, default: 0 },
    acceptMonthChallengeNo: { type: Number, default: 0 },
    acceptWeekChallengeNo: { type: Number, default: 0 },
    previousWin: { type: Boolean, default: false },
    currentVictoryStreak: { type: Number, default: 0 },
    maxVictoryStreak: { type: Number, default: 0 },
    totalWinNo: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ResultModel = mongoose.model("Result", ResultSchema);
module.exports = ResultModel;

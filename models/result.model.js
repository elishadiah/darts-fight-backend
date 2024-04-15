const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const detailSchema = new Schema({
  total: { type: Number, default: 0 },
  season: { type: Number, default: 0 },
});

detailSchema.pre("save", function (next) {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;

  if (currentDate.getDate() === 1) {
    this.season = 0;
  }

  next();
})

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
    monthlyMaestro: {type: Boolean, default: false},
    pyramidClimber: detailSchema,
    challengeConqueror: detailSchema,
    pyramidProtector: {type: Number, default: 0},
    legendaryRivalry: {type: Number, default: 0},
    ironDart: {type: Number, default: 0},
    master180: {type: Number, default: 0},
    consistentScorer: {type: Number, default: 0},
    grandMaster: {type: Number, default: 0},
    level: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ResultSchema.pre('save', function(next) {
  const currentDate = new Date();

  if (this.level === 6 && currentDate.getDate() === 30) {
    this.monthlyMaestro = true;
  } else {
    this.monthlyMaestro = false;
  }

  next();
})

const ResultModel = mongoose.model("Result", ResultSchema);
module.exports = ResultModel;

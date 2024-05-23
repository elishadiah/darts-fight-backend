const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const detailSchema = new Schema({
  lifetime: { type: Number, default: 0 },
  season: { type: Number, default: 0 },
});

const legendarySchema = new Schema({
  opponent: { type: String, default: "" },
  lifetime: { type: Number, default: 0 },
  season: { type: Number, default: 0 },
});

const matchSchema = new Schema({
  leg: { type: Number, default: 0 },
  match: { type: Number, default: 0 },
});

const summarySchema = new Schema({
  doubles: { type: Number, default: 0 },
  master180: { type: Number, default: 0 },
  first9Avg: { type: Number, default: 0 },
  matchAvg: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
});

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
    seasonCurrentVictoryStreak: { type: Number, default: 0 },
    maxVictoryStreak: { type: Number, default: 0 },
    seasonMaxVictoryStreak: { type: Number, default: 0 },
    totalWinNo: { type: Number, default: 0 },
    monthlyMaestro: { type: Number, default: 0 },
    pyramidClimber: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    challengeConqueror: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    pyramidProtector: { type: Number, default: 0 },
    legendaryRivalry: [
      {
        type: legendarySchema,
        default: () => [
          {
            opponent: "",
            lifetime: 0,
            season: 0,
          },
        ],
      },
    ],
    ironDart: { type: Number, default: 0 },
    master180: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    consistentScorer: { type: Number, default: 0 },
    grandMaster: { type: matchSchema, default: () => ({ leg: 0, match: 0 }) },
    maxMarksman: { type: Boolean, default: false },
    dartEnthusiast: { type: Number, default: 0 },
    comeback: { type: Number, default: 0 },
    readyForIt: { type: Number, default: 0 },
    championChallenger: { type: Boolean, default: false },
    level: { type: Number, default: 0 },
    summary: [
      {
        type: summarySchema,
        default: () => [
          {
            doubles: 0,
            master180: 0,
            first9Avg: 0,
            matchAvg: 0,
            level: 0,
          },
        ],
      },
    ],
    active: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

ResultSchema.pre("save", function (next) {
  const currentDate = new Date();
  const currentDay = currentDate.getDate();

  if (currentDay === 1) {
    this.pyramidClimber.season = 0;
    this.challengeConqueror.season = 0;
    this.legendaryRivalry.forEach((rivalry) => {
      rivalry.season = 0;
    });
    this.seasonCurrentVictoryStreak = 0;
    this.seasonMaxVictoryStreak = 0;
  }

  next();
});

const ResultModel = mongoose.model("Result", ResultSchema);
module.exports = ResultModel;

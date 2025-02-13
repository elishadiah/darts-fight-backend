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
  lifetime: {
    leg: { type: Number, default: 0 },
    match: { type: Number, default: 0 },
  },
  season: {
    leg: { type: Number, default: 0 },
    match: { type: Number, default: 0 },
  },
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
    master26: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    }, // lifetime total 26 master
    breakfast: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    highFinish: {
      type: Array,
      default: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
    },
    friendlyChallenger: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    sentTotalChallengeNo: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    }, // lifetime total sent challenge
    // acceptWeekChallengeNo: { type: Number, default: 0 },
    previousWin: { type: Boolean, default: false },
    currentVictoryStreak: { type: Number, default: 0 }, // lifetime current streak
    seasonCurrentVictoryStreak: { type: Number, default: 0 }, // season current streak
    maxVictoryStreak: { type: Number, default: 0 }, // lifetime max streak
    seasonMaxVictoryStreak: { type: Number, default: 0 }, // season max streak
    // totalWinNo: { type: Number, default: 0 },
    victoryStreak: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    currentStreak: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    monthlyMaestro: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    pyramidClimber: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    challengeConqueror: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    pyramidProtector: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
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
    ironDart: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    master180: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    consistentScorer: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    grandMaster: {
      type: matchSchema,
      default: () => ({
        lifetime: { leg: 0, match: 0 },
        season: { leg: 0, match: 0 },
      }),
    },
    maxMarksman: { type: Boolean, default: false },
    dartEnthusiast: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    comeback: { type: Number, default: 0 },
    readyForIt: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
    throwCount: {
      type: detailSchema,
      default: () => ({ lifetime: 0, season: 0 }),
    },
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
    },
    quickToken: {
      type: String,
      default: "",
    },
    scheduleToken: {
      type: String,
      default: "",
    },
    isCheckout: {
      type: Boolean,
      default: false,
    },
    isTheUndergroundChampion: {
      type: Boolean,
      default: false,
    },
    isProjectMayhemWeek: {
      type: Boolean,
      default: false,
    },
    isJacksVictory: {
      type: Boolean,
      default: false,
    },
    isJacksRewarded: {
      type: Boolean,
      default: false,
    },
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

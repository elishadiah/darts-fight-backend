const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const scoreHistorySchema = new Schema({
  scores: [Number],
  doubleMissed: [Number],
  to_finish: Number,
});

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

const AchievementSchema = new Schema(
  {
    master26: {
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
    currentVictoryStreak: { type: Number, default: 0 }, // lifetime current streak
    seasonCurrentVictoryStreak: { type: Number, default: 0 }, // season current streak
    maxVictoryStreak: { type: Number, default: 0 }, // lifetime max streak
    seasonMaxVictoryStreak: { type: Number, default: 0 }, // season max streak
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
  },
  { timestamps: true }
);

const bullSchema = new Schema({
  score: Number,
  username: String,
  isClosed: Boolean,
  isWaiting: Boolean,
});

const playerSchema = new Schema({
  p0: Number,
  p20: Number,
  p26: Number,
  p40: Number,
  p60: Number,
  p80: Number,
  p100: Number,
  p140: Number,
  p160: Number,
  p171: Number,
  p180: Number,
  darts_thrown: Number,
  darts_thrown_double: Number,
  darts_missed_double: Number,
  legs: Number,
  legs_won: Number,
  match_avg: Number,
  currentScore: Number,
  scoreHistory: [scoreHistorySchema],
  initialResult: AchievementSchema,
  updatedResult: AchievementSchema,
  bull: bullSchema,
  name: String,
});

const ScoreSchema = new Schema(
  {
    date: { type: Date, default: new Date() },
    legNo: { type: Number, default: 1 },
    token: { type: String, required: true },
    challengerTurn: { type: Boolean, default: true },
    isFinished: { type: Boolean, default: false },
    p1: playerSchema,
    p2: playerSchema,
    bullModal: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ScoreModel = mongoose.model("Score", ScoreSchema);
module.exports = ScoreModel;

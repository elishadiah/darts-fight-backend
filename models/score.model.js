const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const scoreHistorySchema = new Schema({
  scores: [Number],
  to_finish: Number,
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
  },
  { timestamps: true }
);

const ScoreModel = mongoose.model("Score", ScoreSchema);
module.exports = ScoreModel;

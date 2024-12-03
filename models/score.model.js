const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ScoreSchema = new Schema(
  {
    date: { type: Date, default: new Date() },
    challenger: { type: String, required: true },
    challengerScore: { type: Number, required: true },
    challengerScoreHistory: { type: Array, required: true },
    challengerWins: { type: Number, default: 0 },
    opponent: { type: String, required: true },
    opponentScore: { type: Number, required: true },
    opponentScoreHistory: { type: Array, required: true },
    opponentWins: { type: Number, default: 0 },
    legNo: { type: Number, default: 1 },
    token: { type: String, required: true },
    challengerTurn: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ScoreModel = mongoose.model("Score", ScoreSchema);
module.exports = ScoreModel;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ResultSchema = new Schema(
  {
    player1: {
      type: String,
      required: true,
    },
    player2: {
      type: String,
      required: true,
    },
    results: {
      type: Array,
      default: [],
    },
    winner: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const ArenaSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    joinedUsers: {
      type: Array,
      default: [],
    },
    idleUsers: {
      type: Array,
      default: [],
    },
    matchResults: {
      type: Array,
      default: [
        ResultSchema,
      ],
    },
  },
  { timestamps: true }
);

const ArenaModel = mongoose.model("Arenas", ArenaSchema);
module.exports = ArenaModel;

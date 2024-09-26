const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
      default: [],
    },
  },
  { timestamps: true }
);

const ArenaModel = mongoose.model("Arenas", ArenaSchema);
module.exports = ArenaModel;

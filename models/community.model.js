const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommunitySchema = new Schema(
  {
    fightsCntDay: {
      type: Number,
      default: 0,
    },
    fightsCntWeek: {
      type: Number,
      default: 0,
    },
    fightsCntMonth: {
      type: Number,
      default: 0,
    },
    checkoutCntWeek: {
      type: Number,
      default: 0,
    },
    participantsDay: {
      type: Array,
      default: [],
    },
    participantsWeek: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

const CommunityModel = mongoose.model("Community", CommunitySchema);
module.exports = CommunityModel;

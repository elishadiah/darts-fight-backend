const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const globalCoinSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

const GlobalCoinModel = mongoose.model("GlobalCoin", globalCoinSchema);

module.exports = GlobalCoinModel;

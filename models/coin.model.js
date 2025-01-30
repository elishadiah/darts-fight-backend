const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CoinPurchaseSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  coinsPurchased: {
    type: Number,
    required: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("CoinPurchase", CoinPurchaseSchema);

const CoinModel = require("../models/coin.model");

const saveCoinPurchase = async (req, res) => {
  try {
    const coin = new CoinModel(req.body);
    await coin.save();
    res.status(201).send(coin);
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "An error occurred while saving the coin purchase.",
    });
  }
};

const getCoinPurchases = async (req, res) => {
  try {
    const totalCoins = await CoinModel.aggregate([
      {
        $group: {
          _id: "$username",
          totalCoins: { $sum: "$coinsPurchased" },
          totalEarning: { $sum: "$earning" },
          details: {
            $push: {
              coinsPurchased: "$coinsPurchased",
              earning: "$earning",
              purchaseDate: "$purchaseDate",
            },
          },
        },
      },
    ]);
    res.send(totalCoins);
  } catch (error) {
    res.status(500).send({
      message:
        error.message || "An error occurred while retrieving coin purchases.",
    });
  }
};

module.exports = {
  saveCoinPurchase,
  getCoinPurchases,
};

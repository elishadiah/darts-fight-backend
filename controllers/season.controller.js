const SeasonModel = require("../models/season.model");
const ResultModel = require("../models/result.model");
const UserModel = require("../models/user.model");

const getActiveUsers = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const activeUsers = await UserModel.countDocuments({
    lastLoginDate: { $gte: thirtyDaysAgo },
  });
  return activeUsers;
};

async function resetSeasonProperties() {
  await ResultModel.updateMany(
    {},
    {
      $set: {
        "pyramidClimber.season": 0,
        "challengeConqueror.season": 0,
        "legendaryRivalry.$[].season": 0,
        "master180.season": 0,
        pyramidProtector: 0,
        ironDart: 0,
        consistentScorer: 0,
        "grandMaster.match": 0,
        "grandMaster.leg": 0,
        dartEnthusiast: 0,
        sentTotalChallengeNo: 0,
        readyForIt: 0,
      },
    }
  );
}

const saveSeason = async (req, res) => {
  try {
    const activeUsers = await getActiveUsers();
    const season = new SeasonModel({
      activeUsers,
    });
    await season.save();

    const results = await ResultModel.find({ level: 6 });

    const resultIds = results.map((result) => result._id);

    await SeasonModel.findByIdAndUpdate(season._id, {
      topMembers: resultIds,
    });

    res.status(200).json("Season has been saved successfully!");
  } catch (err) {
    res.status(422).json(err);
  }
};

const adminSeason = async (req, res) => {
  try {
    const currentDate = new Date();

    const currentSeason = await SeasonModel.findOne().sort({ season: -1 });

    const results = await ResultModel.find({ level: 6 });

    const resultIds = results.map((result) => result._id);

    if (currentSeason) {
      currentSeason.seasonEnd = currentDate;
      currentSeason.topMembers = resultIds;
      await currentSeason.save();
    }

    const activeUsers = await getActiveUsers();

    const newSeason = new SeasonModel({
      seasonStart: currentDate,
      activeUsers,
    });

    await newSeason.save();

    await SeasonModel.findByIdAndUpdate(newSeason._id, {
      topMembers: resultIds,
    });

    await resetSeasonProperties();

    res.status(200).json("Season has been saved successfully!");
  } catch (err) {
    res.status(422).json(err);
  }
};

const getAllSeasons = async (req, res) => {
  try {
    const seasons = await SeasonModel.find();

    res.status(200).json(seasons);
  } catch (err) {
    res.status(422).json(err);
  }
};

module.exports = { saveSeason, adminSeason, getAllSeasons };

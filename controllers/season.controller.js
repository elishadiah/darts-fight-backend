const SeasonModel = require("../models/season.model");
const ResultModel = require("../models/result.model");
const UserModel = require("../models/user.model");
const NotificationModel = require("../models/notification.model");
const ArenaModel = require("../models/arena.model");
const EventModel = require("../models/events.model");

const updateSeasonTopMembers = async (result, level) => {
  const season = await SeasonModel.findOne().sort({ season: -1 });
  if (!season) return;
  const topMembers = season.topMembers;
  const index = topMembers.findIndex((val) => val.equals(result._id));
  if (level === 6 && index === -1) {
    topMembers.push(result._id);
  } else if (level !== 6 && index !== -1) {
    topMembers.splice(index, 1);
  }
  await SeasonModel.findByIdAndUpdate(season._id, { topMembers });
};

const getActiveUsers = async () => {
  const activeUsers = await ResultModel.countDocuments({
    active: true,
  });
  return activeUsers;
};

async function resetSeasonProperties() {
  try {
    await ResultModel.updateMany(
      {
        $or: [
          { pyramidClimber: { $type: "object" } },
          { challengeConqueror: { $type: "object" } },
          { master180: { $type: "object" } },
          { grandMaster: { $type: "object" } },
        ],
      },
      {
        $set: {
          "pyramidClimber.season": 0,
          "challengeConqueror.season": 0,
          "master180.season": 0,
          "master26.season": 0,
          "pyramidProtector.season": 0,
          "ironDart.season": 0,
          "consistentScorer.season": 0,
          "grandMaster.match": 0,
          "grandMaster.leg": 0,
          "dartEnthusiast.season": 0,
          "friendlyChallenger.season": 0,
          "readyForIt.season": 0,
          "monthlyMaestro.season": 0,
          "throwCount.season": 0,
          "legendaryRivalry.$[].season": 0,
          seasonMaxVictoryStreak: 0,
          seasonCurrentVictoryStreak: 0,
          level: 0,
        },
      }
    );

    await UserModel.updateMany(
      {},
      {
        $set: {
          defaultBalance: 6,
          vAvatar: {
            title: "",
            ranks: 1,
            subLvl: 1,
            xp: 0,
            img: "",
            scoring: 10,
            checkout: 0.1,
            edge: 0,
            bullseye: 0.1,
            isLocked: false,
            isSelected: true,
          },
        },
      }
    );
  } catch (err) {
    console.log("Error resetting season properties: ", err);
  }
}

const saveSeason = async (req, res) => {
  try {
    const activeUsers = await getActiveUsers();

    const season = new SeasonModel({
      activeUsers,
    });
    await season.save();

    await resetSeasonProperties();

    res.status(200).json("Season has been saved successfully!");
  } catch (err) {
    res.status(422).json(err);
  }
};

const adminSeason = async (req, res) => {
  try {
    const currentDate = new Date();
    const seasonEndDate = new Date();

    if (currentDate.getDate() < 28) {
      seasonEndDate.setDate(28);
    } else {
      seasonEndDate.setMonth(currentDate.getMonth() + 1);
      seasonEndDate.setDate(28);
    }

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
      seasonEnd: seasonEndDate,
      activeUsers,
    });

    await newSeason.save();

    await resetSeasonProperties();

    await cleanDatabase();

    res.status(200).json("Season has been saved successfully!");
  } catch (err) {
    res.status(422).json(err);
  }
};

// clean data for notifications, arena, and events (keep event data for last month)
const cleanDatabase = async () => {
  try {
    const currentDate = new Date();
    const lastMonthDate = new Date(currentDate);
    lastMonthDate.setMonth(currentDate.getMonth() - 1);

    // Clean up notifications
    await NotificationModel.deleteMany({});

    // Clean up arena data older than one month
    await ArenaModel.updateMany(
      {},
      {
        $set: {
          matchResults: [],
          idleUsers: "$joinedUsers", // MongoDB aggregation pipeline syntax
        },
      }
    );

    // Clean up events older than one month
    await EventModel.deleteMany({ createdAt: { $lt: lastMonthDate } });
  } catch (err) {
    console.error("Error cleaning database:", err);
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

module.exports = {
  saveSeason,
  adminSeason,
  getAllSeasons,
  updateSeasonTopMembers,
};

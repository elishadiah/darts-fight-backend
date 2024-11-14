const EventModel = require("../models/events.model.js");
const UserModel = require("../models/user.model.js");
const ResultModel = require("../models/result.model.js");

const postEvent = async (req, res) => {
  try {
    const event = new EventModel(req.body);
    await event.save();
    res.status(200).json("Event has been saved successfully!");
  } catch (err) {
    res.status(422).json(err);
  }
};

const findLastMatch = async (req, res) => {
  const userName = req.query.userName || "";
  try {
    const event = await Event.find({
      eventType: "match",
      $or: [{ user: userName }, { targetUser: userName }],
    })
      .sort({ date: -1 })
      .limit(1);
    res.status(200).json(event);
  } catch (err) {
    res.status(500).json(err);
  }
};

const getEvent = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortDirection = req.query.sortDirection === "asc" ? 1 : -1;
  const skipIndex = (page - 1) * limit;
  const eventType = req.query.eventType || [];
  const userName = req.query.userName || "";

  console.log("sortDirection", userName);

  let query = {};

  if (eventType.length > 0) {
    query.eventType = { $in: eventType };
  }

  if (userName) {
    query.$or = [
      { user: { $regex: new RegExp(userName, "i") } },
      { targetUser: { $regex: new RegExp(userName, "i") } },
    ];
  }

  try {
    const events = await EventModel.find(query)
      .sort({ date: sortDirection })
      .skip(skipIndex)
      .limit(limit);
    const total = await EventModel.countDocuments(query);

    res.status(200).send({
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      items: events,
    });
  } catch (err) {
    res.status(500).json(err);
  }
};

const mostFights = async (req, res) => {
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    );

    const mostEventsInDay = await EventModel.aggregate([
      {
        $match: {
          eventType: "match",
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$match.link",
          uniqueEvents: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$uniqueEvents" },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const lifetimeMostFights = await EventModel.aggregate([
      { $match: { eventType: "match" } },
      {
        $group: {
          _id: "$match.link",
          uniqueEvents: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$uniqueEvents" },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    res
      .status(200)
      .json({ lifetime: lifetimeMostFights, season: mostEventsInDay });
  } catch (err) {
    res.status(500).json(err);
  }
};

const getFightsDay = async () => {
  try {
    // Get all fights of the day
    const date = new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const fights = await fightsPerDay(startOfDay, endOfDay);

    let fightsCount = 0;
    let participantsSet = new Set();
    fights.forEach((fight) => {
      fightsCount += fight.count;
      fight.users.forEach((user) => participantsSet.add(user?.toLowerCase()));
      fight.targetUsers.forEach((targetUser) =>
        participantsSet.add(targetUser?.toLowerCase())
      );
    });
    console.log("Fights per day:", participantsSet, "--->>>>", fights);

    const fightsPerUserInDay = await fightsPerUser(startOfDay, endOfDay);
    console.log("Fights per user in day:", fightsPerUserInDay);

    const participantsArray = Array.from(participantsSet);

    return {
      participants: participantsArray,
      fightsPerUser: fightsPerUserInDay,
      count: fightsCount,
    };
  } catch (err) {
    console.log("----->>", err);
  }
};

const getFightsWeek = async () => {
  try {
    // Get all fights of the week
    const now = new Date();
    const startOfCurrentWeek = new Date(
      now.setDate(now.getDate() - now.getDay())
    );
    const endOfCurrentWeek = new Date(
      now.setDate(startOfCurrentWeek.getDate() + 6)
    );
    const fightsWeek = await fightsPerDay(startOfCurrentWeek, endOfCurrentWeek);

    let fightsCountWeek = 0;
    let participantsSetWeek = new Set();
    fightsWeek.forEach((fight) => {
      fightsCountWeek += fight.count;
      fight.users.forEach((user) =>
        participantsSetWeek.add(user?.toLowerCase())
      );
      fight.targetUsers.forEach((targetUser) =>
        participantsSetWeek.add(targetUser?.toLowerCase())
      );
    });
    console.log("Fights per week:", participantsSetWeek);

    const fightsPerUserInWeek = await fightsPerUser(
      startOfCurrentWeek,
      endOfCurrentWeek
    );
    console.log("Fights per user in week:", fightsPerUserInWeek);

    const participantsArray = Array.from(participantsSetWeek);

    return {
      participants: participantsArray,
      fightsPerUser: fightsPerUserInWeek,
      count: fightsCountWeek,
    };
  } catch (err) {
    console.log("----->>", err);
  }
};

const fightsPerDay = async (startDate, endDate) => {
  try {
    // console.log("startDate", startDate);
    const fightsPerDayThisMonth = await EventModel.aggregate([
      {
        $match: {
          eventType: "match",
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$match.link",
          uniqueEvents: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$uniqueEvents" },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 },
          users: { $addToSet: "$user" },
          targetUsers: { $addToSet: "$targetUser" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return fightsPerDayThisMonth;
  } catch (err) {
    console.log(err);
  }
};

const fightsPerUser = async (startDate, endDate) => {
  try {
    // console.log("startDate", startDate);
    const fightsPerUser = await EventModel.aggregate([
      {
        $match: {
          eventType: "match",
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return fightsPerUser;
  } catch (err) {
    console.log(err);
  }
};

const getWinsPerUser = async (startDate, endDate) => {
  try {
    // console.log("startDate", startDate);
    const winsPerUser = await EventModel.aggregate([
      {
        $match: {
          eventType: "match",
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
          userWins: {
            $sum: {
              $cond: [{ $gt: ["$match.user1Won", "$match.user2Won"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return winsPerUser;
  } catch (err) {
    console.log(err);
  }
};

const getFightsPerDayInMonth = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfCurrentWeek = new Date(
      now.setDate(now.getDate() - now.getDay())
    );
    const endOfCurrentWeek = new Date(
      now.setDate(startOfCurrentWeek.getDate() + 6)
    );
    const startOfLastWeek = new Date(
      now.setDate(startOfCurrentWeek.getDate() - 7)
    );
    const endOfLastWeek = new Date(now.setDate(startOfLastWeek.getDate() + 6));

    console.log("startOfMonth", startOfMonth);

    const fightsPerDayThisMonth = await fightsPerDay(startOfMonth, endOfMonth);
    const fightsPerDayLastMonth = await fightsPerDay(
      startOfLastMonth,
      endOfLastMonth
    );
    const fightsPerDayThisWeek = await fightsPerDay(
      startOfCurrentWeek,
      endOfCurrentWeek
    );
    const fightsPerDayLastWeek = await fightsPerDay(
      startOfLastWeek,
      endOfLastWeek
    );

    res.status(200).json({
      currentMonth: fightsPerDayThisMonth,
      lastMonth: fightsPerDayLastMonth,
      currentWeek: fightsPerDayThisWeek,
      lastWeek: fightsPerDayLastWeek,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

// "100 Fights in 24 Hours" Challenge
const getFightsDayApi = async (req, res) => {
  try {
    const { participants, fightsPerUser, count } = await getFightsDay();

    const regexArray = participants.map(
      (userName) => new RegExp(`^${userName}$`, "i")
    );
    const participantUsers = await UserModel.find({
      username: { $in: regexArray },
    });

    res
      .status(200)
      .json({ participants: participantUsers, count, fightsPerUser });
  } catch (err) {
    console.log("fights-day-->>", err);
    res.status(500).json(err);
  }
};

// "Project Mayhem Week"
const getFightsWeekApi = async (req, res) => {
  try {
    const { participants, fightsPerUser, count } = await getFightsWeek();

    const regexArray = participants.map(
      (userName) => new RegExp(`^${userName}$`, "i")
    );

    const participantUsers = await UserModel.find({
      username: { $in: regexArray },
    });

    res
      .status(200)
      .json({ participants: participantUsers, count, fightsPerUser });
  } catch (err) {
    res.status(500).json(err);
  }
};

// "Jacks Victory" Challenge
const getWinsPerUserAPI = async (req, res) => {
  try {
    const now = new Date();
    const startOf48Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const endOf48Hours = now;
    const winsPerUserLast48Hours = await getWinsPerUser(
      startOf48Hours,
      endOf48Hours
    );

    const userNames = winsPerUserLast48Hours.map((user) => user._id);
    const oldResults = await ResultModel.find({
      username: { $in: userNames },
    });

    await Promise.all(
      winsPerUserLast48Hours.map(async (user) => {
        if (user?.userWins >= 10) {
          await ResultModel.updateOne(
            { username: user._id },
            { isJacksVictory: true }
          );
        }
      })
    );

    await Promise.all(
      winsPerUserLast48Hours.map(async (user) => {
        if (user?.userWins >= 10) {
          await UserModel.updateOne(
            { username: user._id },
            { $inc: { xp: 50 } }
          );
        }
      })
    );

    const userResults = await ResultModel.find({
      username: { $in: userNames },
    });

    // Map the isJacksVictory field to the response
    const response = winsPerUserLast48Hours.map((user) => {
      const userResult = userResults.find(
        (result) => result.username === user._id
      );
      return {
        ...user,
        isJacksVictory: userResult ? userResult.isJacksVictory : false,
        isJacksRewarded: userResult ? userResult.isJacksRewarded : false,
      };
    });

    const socket = req.app.get("socketIo");

    const oldVictoryFalseSet = new Set(
      oldResults
        .filter((result) => !result.isJacksVictory)
        .map((result) => result.username)
    );

    // Emit the event to the client
    response.forEach((user) => {
      if (user.isJacksVictory && oldVictoryFalseSet.has(user._id)) {
        socket.emit("jacks-victory", { username: user._id });
      }
    });

    res.status(200).json({ winsPerUserLast48Hours: response });
  } catch (err) {
    res.status(500).json(err);
    console.log(err);
  }
};

module.exports = {
  postEvent,
  getEvent,
  findLastMatch,
  mostFights,
  fightsPerDay,
  getFightsPerDayInMonth,
  getFightsWeek,
  getFightsDay,
  getWinsPerUser,
  getFightsDayApi,
  getFightsWeekApi,
  getWinsPerUserAPI,
};

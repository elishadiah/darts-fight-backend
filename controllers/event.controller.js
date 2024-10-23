const EventModel = require("../models/events.model.js");

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
    console.log("Fights per day:", participantsSet);

    const participantsArray = Array.from(participantsSet);

    return { participants: participantsArray, count: fightsCount };
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

    const participantsArray = Array.from(participantsSetWeek);

    return { participants: participantsArray, count: fightsCountWeek };
  } catch (err) {
    console.log("----->>", err);
  }
};

const fightsPerDay = async (startDate, endDate) => {
  try {
    console.log("startDate", startDate);
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
    const { participants, count } = await getFightsDay();

    const regexArray = participants.map(
      (userName) => new RegExp(`^${userName}$`, "i")
    );
    const participantUsers = await UserModel.find({
      username: { $in: regexArray },
    });

    res.status(200).json({ participants: participantUsers, count });
  } catch (err) {
    res.status(500).json(err);
  }
};

// "Project Mayhem Week"
const getFightsWeekApi = async (req, res) => {
  try {
    const { participants, count } = await getFightsWeek();

    const regexArray = participants.map(
      (userName) => new RegExp(`^${userName}$`, "i")
    );

    const participantUsers = await UserModel.find({
      username: { $in: regexArray },
    });

    res.status(200).json({ participants: participantUsers, count });
  } catch (err) {
    res.status(500).json(err);
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
  getFightsDayApi,
  getFightsWeekApi,
};

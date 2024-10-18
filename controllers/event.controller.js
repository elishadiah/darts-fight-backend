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
    const endOfLastWeek = new Date(
      now.setDate(startOfLastWeek.getDate() + 6)
    );

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

module.exports = {
  postEvent,
  getEvent,
  findLastMatch,
  mostFights,
  getFightsPerDayInMonth,
};

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

module.exports = { postEvent, getEvent, findLastMatch };

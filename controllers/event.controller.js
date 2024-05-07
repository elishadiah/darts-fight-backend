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

const getEvent = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const content = req.query.content?.toLowerCase() || "";
  const sortDirection = req.query.sortDirection === "asc" ? 1 : -1;
  const skipIndex = (page - 1) * limit;

  try {
    const events = await EventModel.find({
      $or: [
        { user: { $regex: new RegExp(content, "i") } },
        { targetUser: { $regex: new RegExp(content, "i") } },
        { eventType: { $regex: new RegExp(content, "i") } },
      ],
    })
      .sort({ date: sortDirection })
      .skip(skipIndex)
      .limit(limit);
    const total = await EventModel.countDocuments({
      $or: [
        { user: { $regex: new RegExp(content, "i") } },
        { targetUser: { $regex: new RegExp(content, "i") } },
        { eventType: { $regex: new RegExp(content, "i") } },
      ],
    });

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

module.exports = { postEvent, getEvent };

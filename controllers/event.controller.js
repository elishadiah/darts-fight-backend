const EventModel = require("../models/events.model.js");

const postEvent = async (req, res) => {
  try {
    await EventModel.create({
      date: req.body.date,
      content: req.body.content,
    });
    res.status(200).json("save-event");
  } catch (err) {
    res.status(422).json(err);
  }
};

const getEvent = async (req, res) => {
  try {
    const events = await EventModel.find();
    res.status(200).json(events);
  } catch (err) {
    res.status(422).json(err);
  }
};

module.exports = { postEvent, getEvent };

const ScheduleModel = require("../models/schedule.model");

saveSchedule = async (req, res) => {
  try {
    await ScheduleModel.create({
      date: req.body.date,
      challenger: req.body.username,
      challengerEmail: req.body.email,
      receiver: req.body.receiver,
      receiverEmail: req.body.receiverEmail,
    });
    res.status(200).json("save-schedule");
  } catch (err) {
    res.status(422).json(err);
  }
};

fetchAllSchedule = async (req, res) => {
  try {
    const schedules = await ScheduleModel.find();
    if (!schedules) res.status(404).json("Schedule not found");
    res.status(200).json(schedules);
  } catch (err) {
    res.status(422).json(err);
  }
};

removeSchedule = async (req, res) => {
  try {
    await ScheduleModel.findByIdAndDelete(req.body._id);
    res.status(200).json("Delete successfully");
  } catch (err) {
    res.status(422).json(err);
  }
};

module.exports = { saveSchedule, fetchAllSchedule, removeSchedule };

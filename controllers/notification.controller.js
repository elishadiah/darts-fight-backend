const NotificationModel = require("../models/notification.model.js");

const postNotification = async (req, res) => {
  try {
    const notification = new NotificationModel(req.body);
    await notification.save();
    res.status(200).json("Notification has been saved successfully!");
  } catch (err) {
    res.status(422).json(err);
  }
};

module.exports = { postNotification };

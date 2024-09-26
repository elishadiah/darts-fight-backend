const cron = require("node-cron");
const ScheduleModel = require("../models/schedule.model.js");
const UserModel = require("../models/user.model.js");
const NotificationModel = require("../models/notification.model.js");
const { sendEmailNotification } = require("../email.js");

const addMinutes = (date, minutes) => {
  const dateCopy = new Date(date);
  dateCopy.setMinutes(dateCopy.getMinutes() + minutes);
  return dateCopy;
};

const removeSchedule = async (id) => {
  try {
    await ScheduleModel.findByIdAndDelete(id);
  } catch (err) {
    console.log("----->>", err);
  }
};

const scheduleTasks = () => {
  
}

module.exports = scheduleTasks;

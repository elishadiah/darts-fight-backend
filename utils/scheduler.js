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

const scheduleTasks = (socket) => {
  cron.schedule("* * * * *", async () => {
    try {
      const schedules = await ScheduleModel.find();
      schedules.map(async (item) => {
        const receiver = await UserModel.findOne({ username: item.receiver });
        const challenger = await UserModel.findOne({
          username: item.challenger,
        });

        if (
          new Date() > addMinutes(item.date, -240) &&
          new Date() < addMinutes(item.date, -239)
        ) {
          const message = "There are less than 4 hours left until the game...";
          const rnotification = new NotificationModel({
            message,
            to: receiver?._id.toString(),
          });
          const cnotification = new NotificationModel({
            message,
            to: receiver?._id.toString(),
          });
          const rres = await rnotification.save();
          const cres = await cnotification.save();

          if (receiver && challenger) {
            socket
              .to(receiver?._id.toString())
              .to(challenger?._id.toString())
              .emit("schedule-notification", { notification: rres });
          }
        } else if (
          new Date() > addMinutes(item.date, -1) &&
          new Date() < new Date(item.date)
        ) {
          const message = "It's time to start your upcoming challenge...";
          const rnotification = new NotificationModel({
            message,
            to: receiver?._id.toString(),
          });
          const cnotification = new NotificationModel({
            message,
            to: receiver?._id.toString(),
          });
          const rres = await rnotification.save();
          const cres = await cnotification.save();

          if (receiver && challenger) {
            socket
              .to(receiver?._id.toString())
              .to(challenger?._id.toString())
              .emit("schedule-notification", { notification: rres });
          }
        } else if (new Date() >= addMinutes(item.date, 10)) {
          removeSchedule(item._id);
        }
      });
    } catch (err) {
      console.log("Cron-schedule-err-->>", err);
    }
  });

  cron.schedule("0 * * * *", async function () {
    try {
      await UserModel.updateMany(
        { stamina: { $lt: 100 } },
        { $inc: { stamina: 10 } }
      );
      await UserModel.updateMany(
        { stamina: { $gt: 100 } },
        { $set: { stamina: 100 } }
      );
      const users = await UserModel.find();
      socket.broadcast.emit("stamina-recovery", users);
    } catch (err) {
      console.error("Failed to recover stamina:", err);
    }
  });

  // Define other cron jobs here...
};

module.exports = scheduleTasks;

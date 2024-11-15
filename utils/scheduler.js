const cron = require("node-cron");
const ScheduleModel = require("../models/schedule.model.js");
const UserModel = require("../models/user.model.js");
const NotificationModel = require("../models/notification.model.js");
const ResultModel = require("../models/result.model.js");
const SeasonModel = require("../models/season.model.js");
const { sendEmailNotification } = require("../email.js");
const {
  getFightsDay,
  getFightsWeek,
  getWinsPerUser,
} = require("../controllers/event.controller.js");
const { adminSeason } = require("../controllers/season.controller.js");

const CRON_SCHEDULES = {
  WEEKLY: "0 0 * * 1",
  DAILY: "0 0 * * *",
  HOURLY: "0 * * * *",
  MINUTELY: "* * * * *",
};

const TIME_INTERVALS = {
  FOUR_HOURS: -240,
  ONE_MINUTE: -1,
  TEN_MINUTES: 10,
};

const addMinutes = (date, minutes) => {
  try {
    const dateCopy = new Date(date);
    dateCopy.setMinutes(dateCopy.getMinutes() + minutes);
    return dateCopy;
  } catch (err) {
    console.error("Error in addMinutes:", err);
  }
};

const removeSchedule = async (id) => {
  try {
    await ScheduleModel.findByIdAndDelete(id);
  } catch (err) {
    console.error("Error in removeSchedule:", err);
  }
};

const updateUsersXp = async (regexArray, xp) => {
  await UserModel.updateMany(
    { username: { $in: regexArray } },
    { $inc: { xp } }
  );
};

const emitEvent = (socketIO, event, data) => {
  socketIO.emit(event, data);
};

const scheduleTasks = (socketIO) => {
  cron.schedule(CRON_SCHEDULES.WEEKLY, async () => {
    try {
      // "Project Mayhem Week"
      const {
        participants: participantsWeek,
        fightsPerUser,
        count: countWeek,
      } = await getFightsWeek();

      if (countWeek >= 500) {
        const regexArray = participantsWeek.map(
          (userName) => new RegExp(`^${userName}$`, "i")
        );
        await updateUsersXp(regexArray, 500);

        const maxFightUser = fightsPerUser.reduce((max, user) => {
          return user.count > max.count ? user : max;
        }, fightsPerUser[0]);

        emitEvent(socketIO, "project-mayhem-week", {
          participantsWeek,
          maxFightUser,
        });

        await ResultModel.updateOne(
          { username: maxFightUser._id },
          { $set: { isProjectMayhemWeek: true } }
        );

        console.log("Project Mayhem Week executed successfully");

        // checkout reset
        await ResultModel.updateMany(
          { isCheckout: { $ne: false } },
          { $set: { isCheckout: false } }
        );
      }
    } catch (error) {
      console.error("Error during weekly reset:", error);
    }
  });

  cron.schedule(CRON_SCHEDULES.DAILY, async () => {
    const currentDate = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    try {
      // Update all users to isFirstLogin: true
      await UserModel.updateMany({}, { $set: { isFirstLogin: true } });
      console.log("isFirstLogin updated successfully");

      // "100 Fights in 24 Hours" Challenge
      const { participants, fightsPerUser, count } = await getFightsDay();
      if (count >= 100) {
        const regexArray = participants.map(
          (userName) => new RegExp(`^${userName}$`, "i")
        );
        await updateUsersXp(regexArray, 100);

        const maxFightUser = fightsPerUser.reduce((max, user) => {
          return user.count > max.count ? user : max;
        }, fightsPerUser[0]);

        emitEvent(socketIO, "underground-champion", {
          participants,
          maxFightUser,
        });

        await ResultModel.updateOne(
          { username: maxFightUser._id },
          { $set: { isTheUndergroundChampion: true } }
        );

        console.log("100 Fights in 24 Hours executed successfully");
      }

      // seaseon restart if last season is over
      const lastSeason = await SeasonModel.findOne().sort({ season: -1 });
      if (lastSeason && lastSeason.seasonEnd < currentDate) {
        await adminSeason();
      }

      // inactive users after one month
      const result = await ResultModel.updateMany(
        { updatedAt: { $lt: oneMonthAgo } }, // Filter: selects documents with a date older than one week
        { $set: { active: false } } // Update operation: sets the active field to false
      );

      console.log("inactive documents:", result.modifiedCount);

      // down level users after one week
      const documents = await ResultModel.find({
        updatedAt: { $lt: oneWeekAgo },
        level: { $in: [4, 5, 6] },
      });

      for (const doc of documents) {
        const currentLevel = doc.level;
        const nextLevel = currentLevel - 1;
        const userCountAtNextLevel = await ResultModel.countDocuments({
          level: nextLevel,
        });

        if (
          (currentLevel === 6 && userCountAtNextLevel >= 8) ||
          (currentLevel === 5 && userCountAtNextLevel >= 16) ||
          (currentLevel === 4 && userCountAtNextLevel >= 32)
        ) {
          // Find a document at the next level to exchange levels
          const replacementDoc = await ResultModel.findOne({
            level: nextLevel,
          });
          if (replacementDoc) {
            // Exchange levels
            await ResultModel.updateOne(
              { _id: doc._id },
              { $set: { level: replacementDoc.level } }
            );
            await ResultModel.updateOne(
              { _id: replacementDoc._id },
              { $set: { level: currentLevel } }
            );
          }
        } else {
          // Simply decrement the level of the current document
          await ResultModel.updateOne(
            { _id: doc._id },
            { $set: { level: nextLevel } }
          );
        }
      }

      console.log("Documents updated successfully");
    } catch (err) {
      console.error("Failed to ping users:", err);
    }
  });

  cron.schedule("CRON_SCHEDULES.HOURLY", async function () {
    try {
      await UserModel.updateMany(
        { stamina: { $lt: 100 } },
        { $inc: { stamina: 10 } }
      );

      // Ensure stamina does not exceed 100
      await UserModel.updateMany(
        { stamina: { $gt: 100 } },
        { $set: { stamina: 100 } }
      );

      console.log("Stamina recovery executed successfully");
    } catch (err) {
      console.error("Failed to recover stamina:", err);
    }
  });

  cron.schedule(CRON_SCHEDULES.MINUTELY, async () => {
    try {
      // Send notifications for upcoming challenges
      const schedules = await ScheduleModel.find();
      schedules.forEach(async (item) => {
        const receiver = await UserModel.findOne({ username: item.receiver });
        const challenger = await UserModel.findOne({
          username: item.challenger,
        });

        if (
          new Date() > addMinutes(item.date, TIME_INTERVALS.FOUR_HOURS) &&
          new Date() < addMinutes(item.date, TIME_INTERVALS.FOUR_HOURS + 1)
        ) {
          sendEmailNotification(
            item.receiver,
            item.receiverEmail,
            item.challenger,
            item.challengerEmail,
            "Bis zum Spiel sind es noch weniger als 4 Stunden. Wenn Sie jetzt absagen, verlieren Sie im Grunde das Spiel. Wenn Sie abbrechen möchten, stornieren Sie bitte die geplante Herausforderung auf der Seite „Profil“.",
            "Kommende Herausforderungen"
          );

          const message =
            "There are less than 4 hours left until the game. If you cancel now, you will essentially lose the game. If you want to cancel, please cancel the scheduled challenge on the Profile page.";

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
            socketIO
              .to(receiver?._id.toString())
              .to(challenger?._id.toString())
              .emit("schedule-notification", {
                notification: rres,
              });
          }
        } else if (
          new Date() > addMinutes(item.date, TIME_INTERVALS.ONE_MINUTE) &&
          new Date() < new Date(item.date)
        ) {
          sendEmailNotification(
            item.receiver,
            item.receiverEmail,
            item.challenger,
            item.challengerEmail,
            "Es ist Zeit, mit Ihrer bevorstehenden Herausforderung zu beginnen. Bitte erstellen Sie auf Ihrer „Profil“-Seite eine Challenge.",
            "Kommende Herausforderungen"
          );

          const message =
            "It's time to start your upcoming challenge. Please create a challenge on your Calendar in Profile page.";

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
            socketIO
              .to(receiver?._id.toString())
              .to(challenger?._id.toString())
              .emit("schedule-notification", {
                notification: rres,
              });
          }
        } else if (
          new Date() >= addMinutes(item.date, TIME_INTERVALS.TEN_MINUTES)
        ) {
          console.log("Cron-schedule--remove-->>", item);
          removeSchedule(item._id);
        }
      });
    } catch (err) {
      console.log("Cron-schedule-err-->>", err);
    }
  });
};

module.exports = scheduleTasks;

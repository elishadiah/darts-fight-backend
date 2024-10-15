const cron = require("node-cron");
const ScheduleModel = require("../models/schedule.model.js");
const UserModel = require("../models/user.model.js");
const NotificationModel = require("../models/notification.model.js");
const ResultModel = require("../models/result.model.js");
const CommunityModel = require("../models/community.model.js");
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
  cron.schedule("0 0 * * 1", async () => {
    try {
      await CommunityModel.updateMany(
        {},
        {
          $set: {
            checkoutCntWeek: 0,
            fightsCntWeek: 0,
            participantsWeek: [],
          },
        }
      );
      console.log(
        "Weekly reset of checkoutCntWeek and participantsWeek completed."
      );
    } catch (error) {
      console.error("Error during weekly reset:", error);
    }
  });

  cron.schedule("0 0 * * *", async function () {
    const currentDate = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    try {
      await UserModel.updateMany({}, { $set: { isFirstLogin: true } });
      console.log("isFirstLogin updated successfully");

      await CommunityModel.updateMany(
        {},
        {
          $set: {
            fightsCntDay: 0,
            participantsDay: [],
          },
        }
      );
      console.log(
        "Daily reset of checkoutCntWeek and participantsWeek completed."
      );

      const lastSeason = await SeasonModel.findOne().sort({ season: -1 });
      if (lastSeason && lastSeason.seasonEnd < currentDate) {
        await adminSeason();
      }

      const result = await ResultModel.updateMany(
        { updatedAt: { $lt: oneMonthAgo } }, // Filter: selects documents with a date older than one week
        { $set: { active: false } } // Update operation: sets the active field to false
      );

      console.log("inactive documents:", result.modifiedCount);

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

        // Perform the update
        if (Object.keys(updateData).length > 0) {
          await ResultModel.updateOne({ _id: doc._id }, updateData);
        }
      }

      console.log("Documents updated successfully");
    } catch (err) {
      console.error("Failed to ping users:", err);
    }
  });

  cron.schedule("0 * * * *", async function () {
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

      // const users = await UserModel.find();

      // socket.broadcast.emit("stamina-recovery", users);

      console.log("Stamina recovery executed successfully");
    } catch (err) {
      console.error("Failed to recover stamina:", err);
    }
  });

  cron.schedule("* * * * *", async () => {
    try {
      const schedules = await ScheduleModel.find();
      schedules.map((item) => {
        if (
          new Date() > addMinutes(item.date, -240) &&
          new Date() < addMinutes(item.date, -239)
        ) {
          sendEmailNotification(
            item.receiver,
            item.receiverEmail,
            item.challenger,
            item.challengerEmail,
            "Bis zum Spiel sind es noch weniger als 4 Stunden. Wenn Sie jetzt absagen, verlieren Sie im Grunde das Spiel. Wenn Sie abbrechen möchten, stornieren Sie bitte die geplante Herausforderung auf der Seite „Profil“.",
            "Kommende Herausforderungen"
          );
        } else if (
          new Date() > addMinutes(item.date, -1) &&
          new Date() < new Date(item.date)
        ) {
          console.log("Cron-schedule--notification-->>", item);
          sendEmailNotification(
            item.receiver,
            item.receiverEmail,
            item.challenger,
            item.challengerEmail,
            "Es ist Zeit, mit Ihrer bevorstehenden Herausforderung zu beginnen. Bitte erstellen Sie auf Ihrer „Profil“-Seite eine Challenge.",
            "Kommende Herausforderungen"
          );
        } else if (new Date() >= addMinutes(item.date, 10)) {
          console.log("Cron-schedule--remove-->>", item);
          removeSchedule(item._id);
        }
        console.log("Cron-schedule-->>", item);
      });
    } catch (err) {
      console.log("Cron-schedule-err-->>", err);
    }
  });
};

module.exports = scheduleTasks;

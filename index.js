const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http").Server(app);
const cron = require("node-cron");
const ScheduleModel = require("./models/schedule.model.js");
const NotificationModel = require("./models/notification.model.js");
const ResultModel = require("./models/result.model.js");
const UserModel = require("./models/user.model.js");
const SeasonModel = require("./models/season.model.js");
const { sendEmailNotification } = require("./email.js");
const {
  resetSeasonProperties,
  adminSeason,
} = require("./controllers/season.controller.js");
const { updateXPAndRank } = require("./controllers/auth.controller.js");

const crypto = require("crypto");

const PORT = 4000;
const mongoURI =
  "mongodb+srv://diahelisha:51K8YoxU3k90C62J@darts-fight-database-4d8fe03d.mongo.ondigitalocean.com/admin";

// routes
const AuthRoute = require("./routes/auth.route.js");
const AvatarRoute = require("./routes/avatar.route.js");
const ResultRoute = require("./routes/result.route.js");
const ScheduleRoute = require("./routes/schedule.route.js");
const EventRoute = require("./routes/event.route.js");
const NotificationRoute = require("./routes/notification.route.js");
const SeasonRoute = require("./routes/season.route.js");

mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 20000);

async function connectToMongoDB() {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit the process if unable to connect to MongoDB
  }
}

// mongoose
//   .connect(mongoURI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     serverSelectionTimeoutMS: 5000,
//     socketTimeoutMS: 45000,
//   })
//   .then(() => console.log("connected!"))
//   .catch((error) => console.log(`${error} did not connect`));

connectToMongoDB().then(() => {
  console.log("connected!");
  http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const socketIO = require("socket.io")(http, {
    cors: {
      origin: "*",
    },
  });

  app.use(bodyParser.json({ limit: "30mb", extended: true }));
  app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
  app.use(cors());

  const { InMemorySessionStore } = require("./sessionStore.js");
  const sessionStore = new InMemorySessionStore();

  socketIO.use((socket, next) => {
    const userID = socket.handshake.auth.userID;
    const username = socket.handshake.auth.username;

    if (!username) {
      return next(new Error("invalid username"));
    }

    if (userID) {
      socket.userID = userID;
      socket.username = username;
      return next();
    }
  });

  socketIO.on("connection", async (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    await UserModel.updateOne({ _id: socket.userID }, { status: "online" });

    // emit session details
    socket.emit("user_id", {
      userID: socket.userID,
    });

    // join the "userID" room
    socket.join(socket.userID);

    // fetch existing users
    const users = await UserModel.find({
      status: { $in: ["online", "occupied"] },
    });

    socket.emit("users", users);

    // Top players challenge
    socket.on("findUserByName", (data) => {
      const { username } = data;
      console.log("find--user--byname-->>", username);
      const user = sessionStore
        .findAllSessions()
        ?.find((val) => val.username === username);
      if (user) {
        socket.emit("foundUser", user);
      } else {
        socket.emit("foundUser", null);
      }
    });

    socket.on("top-challenge", async ({ message, challenger, receiver }) => {
      const cUser = UserModel.findOne({ username: challenger });
      const rUser = UserModel.findOne({ username: receiver });

      if (cUser && rUser) {
        const notification = new NotificationModel({
          message,
          to: rUser._id,
        });
        notification.save();

        await UserModel.updateMany(
          { username: { $in: [challenger, receiver] } },
          { status: "occupied" }
        );

        const updatedUsersList = await UserModel.find({
          username: { $in: [receiver, challenger] },
        });

        socket.broadcast.emit("statusUpdate", {
          updatedUsersList,
        });

        socket.to(rUser._id).emit("top-challenge-response", { notification });
      }
    });

    NotificationModel.find({ to: socket.userID, read: false }).then(
      (notifications) => {
        socket.emit("notifications", notifications);
      }
    );

    // notify existing users
    socket.broadcast.emit("user connected", {
      userID: socket.userID,
      username: socket.username,
      status: "online",
    });

    socket.on("notificationRead", async (notificationId) => {
      try {
        // Mark the notification as read
        await NotificationModel.updateOne(
          { _id: notificationId },
          { read: true }
        );
      } catch (err) {
        console.log("notificationRead--err>>", err);
      }
    });

    socket.on("allNotificationsRead", async () => {
      try {
        // Mark all notifications as read
        await NotificationModel.updateMany(
          { to: socket.userID },
          { read: true }
        );
      } catch (err) {
        console.log("allNotificationsRead--err>>", err);
      }
    });

    // forward the private message to the right recipient (and to other tabs of the sender)
    socket.on(
      "challenge",
      async ({ message, toId, fromId, to, from, paymentOption }) => {
        const notification = new NotificationModel({
          message,
          to: toId,
          read: false,
        });
        try {
          const token = crypto.randomBytes(16).toString("hex");

          await ResultModel.updateMany(
            { username: { $in: [to, from] } },
            { quickToken: token }
          );

          const res = await notification.save();

          await UserModel.updateMany(
            { username: { $in: [to, from] } },
            { status: "occupied" }
          );

          const updatedUsersList = await UserModel.find({
            username: { $in: [to, from] },
          });

          socket.broadcast.emit("statusUpdate", {
            updatedUsersList,
          });

          socket.to(toId).emit("quick-notification", {
            notification: res,
            token,
            to,
            from,
            fromId,
            paymentOption,
          });

          const challenger = await UserModel.findOne({ username: from });
          updateXPAndRank(challenger._id, 20);
        } catch (err) {
          console.log("challenge--err>>", err);
        }
      }
    );

    socket.on("cancel-challenge", async ({ message, toId, fromId }) => {
      try {
        const notification = new NotificationModel({
          message,
          to: toId,
          read: false,
        });
        const res = await notification.save();

        await UserModel.updateMany(
          { _id: { $in: [toId, fromId] } },
          { status: "online" }
        );

        const updatedUsersList = await UserModel.find({
          _id: { $in: [toId, fromId] },
        });

        socket.broadcast.emit("statusUpdate", {
          updatedUsersList,
        });

        socket.to(toId).emit("cancel-challenge-response", {
          notification: res,
          fromId,
        });
      } catch (err) {
        console.log("cancel-challenge--err>>", err);
      }
    });

    socket.on("quick-accept", async ({ toId, opponent, challenger, paymentOption, token }) => {
      console.log("quick-accept-->>", toId);
      socket
        .to(toId)
        .emit("quick-accept-response", { paymentOption, token, opponent });
      
        const user = await UserModel.findOne({ username: opponent });
        updateXPAndRank(user._id, 20);
    });

    socket.on("challenge-decline", async ({ message, to, from }) => {
      try {
        const notification = new NotificationModel({
          message,
          to,
        });
        const res = await notification.save();

        await UserModel.updateMany(
          { _id: { $in: [to, from] } },
          { status: "online" }
        );

        const updatedUsersList = await UserModel.find({
          _id: { $in: [to, from] },
        });

        socket.broadcast.emit("statusUpdate", {
          updatedUsersList,
        });

        socket
          .to(to)
          .emit("challenge-decline-response", { notification: res, from });
      } catch (err) {
        console.log("challenge-decline--err>>", err);
      }
    });

    socket.on("update-user-status", async ({ status, userID }) => {
      try {
        await UserModel.updateOne({ _id: userID }, { status });
        const updatedUser = await UserModel.findById(userID);

        const updatedUsersList = [updatedUser];

        socket.broadcast.emit("statusUpdate", {
          updatedUsersList,
        });
      } catch (err) {
        console.log("update-user-status--err>>", err);
      }
    });

    socket.on(
      "schedule-challenge",
      async ({
        message,
        to,
        receiver,
        challenger,
        receiverEmail,
        challengerEmail,
        date,
        paymentOption,
      }) => {
        const notification = new NotificationModel({ message, to });
        try {
          const res = await notification.save();

          socket.to(to).emit("notification", res);

          const token = crypto.randomBytes(16).toString("hex");

          await ScheduleModel.create({
            date,
            challenger,
            challengerEmail,
            receiver,
            receiverEmail,
            token,
            payment: paymentOption,
          });
        } catch (err) {
          console.log("challenge--err>>", err);
        }
      }
    );

    socket.on(
      "schedule-create-challenge",
      async ({ message, toId, fromId, to, from, token }) => {
        const notification = new NotificationModel({ message, to: toId });
        try {
          const res = await notification.save();

          await UserModel.updateMany(
            { username: { $in: [to, from] } },
            { status: "occupied" }
          );

          socket.to(toId).emit("notification", res);

          // await UserModel.updateOne({ _id: userID }, { status });
          const updatedUser = await UserModel.find({
            username: { $in: [to, from] },
          });

          const updatedUsersList = updatedUser;

          socket.broadcast.emit("statusUpdate", {
            updatedUsersList,
          });

          socket
            .to(toId)
            .emit("schedule-create-challenge-response", { fromId, token });
        } catch (err) {
          console.log("challenge--err>>", err);
        }
      }
    );

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
              socket
                .to(receiver?._id.toString())
                .to(challenger?._id.toString())
                .emit("schedule-notification", {
                  notification: rres,
                });
            }
          } else if (
            new Date() > addMinutes(item.date, -1) &&
            new Date() < new Date(item.date)
          ) {
            console.log("Cron-schedule--notification1111-->>");
            const message =
              "It's time to start your upcoming challenge. Please create a challenge on your Profile page.";

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
                .emit("schedule-notification", {
                  notification: rres,
                });
            }
          }
          // console.log("Cron-schedule111-->>");
        });
      } catch (err) {
        console.log("Cron-schedule-err-->>", err);
      }
    });

    // notify users upon disconnection
    socket.on("disconnect", async () => {
      try {
        const matchingSockets = await socketIO.in(socket.userID).allSockets();
        const isDisconnected = matchingSockets.size === 0;
        if (isDisconnected) {
          await UserModel.updateOne(
            { _id: socket.userID },
            { status: "offline" }
          );

          // notify other users
          socket.broadcast.emit("user disconnected", {
            userID: socket.userID,
            username: socket.username,
            status: "offline",
          });
        }
      } catch (err) {
        console.log("disconnect--err>>", err);
      }
    });
  });

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

  // cron.schedule("0 0 1 * *", async function () {
  //   try {
  //     await resetSeasonProperties();
  //     console.log("Season field reset successfully");
  //   } catch (err) {
  //     console.error("Failed to reset season field:", err);
  //   }
  // });

  cron.schedule("0 0 * * *", async function () {
    const currentDate = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    try {
      const lastSeason = await SeasonModel.findOne().sort({ season: -1 });
      if (lastSeason && lastSeason.seasonEnd < currentDate) {
        await adminSeason();
      }

      await UserModel.updateMany({}, { isFirstLogin: true });

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

  app.get("/api", (req, res) => {
    res.json({ message: "Hello TTT" });
  });
  app.use("/auth", AuthRoute);
  app.use("/avatar", AvatarRoute);
  app.use("/result", ResultRoute);
  app.use("/schedule", ScheduleRoute);
  app.use("/event", EventRoute);
  app.use("/notification", NotificationRoute);
  app.use("/season", SeasonRoute);
});

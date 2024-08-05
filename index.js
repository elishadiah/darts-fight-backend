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
const { sendEmailNotification } = require("./email.js");
const { resetSeasonProperties } = require("./controllers/season.controller.js");

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

const { saveSeason } = require("./controllers/season.controller.js");

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
    const sessionID = socket.handshake.auth.sessionID;
    if (sessionID) {
      const session = sessionStore.findSession(sessionID);
      console.log("Session-->>>", session, sessionID, socket.handshake.auth);
      if (session) {
        socket.sessionID = sessionID;
        socket.userID = session.userID;
        socket.username = session.username;
        return next();
      }
    }
    const username = socket.handshake.auth.username;
    console.log("username-->>>", username, socket.handshake.auth);
    if (!username) {
      return next(new Error("invalid username"));
    }
    socket.sessionID = socket.handshake.auth.sessionID;
    socket.userID = socket.handshake.auth.sessionID;
    socket.username = username;
    next();
  });

  socketIO.on("connection", (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    // persist session
    sessionStore.saveSession(socket.sessionID, {
      userID: socket.userID,
      username: socket.username,
      connected: true,
      status: "online",
    });

    // emit session details
    socket.emit("user_id", {
      userID: socket.userID,
    });

    // join the "userID" room
    socket.join(socket.userID);

    // fetch existing users
    const users = [];
    sessionStore.findAllSessions().forEach((session) => {
      users.push({
        userID: session.userID,
        username: session.username,
        connected: session.connected,
        status: session.status,
      });
    });
    console.log("users-->>", users);
    socket.emit("users", users);

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

    NotificationModel.find({ to: socket.userID, read: false }).then(
      (notifications) => {
        socket.emit("notifications", notifications);
      }
    );

    // notify existing users
    socket.broadcast.emit("user connected", {
      userID: socket.userID,
      username: socket.username,
      connected: true,
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

          console.log("challenge--res>>", res);

          sessionStore.saveSession(socket.sessionID, {
            userID: fromId,
            username: from,
            connected: true,
            status: "occupied",
          });

          sessionStore.saveSession(socket.sessionID, {
            userID: toId,
            username: to,
            connected: true,
            status: "occupied",
          });

          socket.broadcast.emit("statusUpdate", {
            fromId,
            toId,
            status: "Occupied",
          });

          socket.to(toId).emit("quick-notification", {
            notification: res,
            token,
            to,
            fromId,
            paymentOption,
          });

        } catch (err) {
          console.log("challenge--err>>", err);
        }
      }
    );

    console.log("all---users-->>", sessionStore.findAllSessions());

    socket.on("cancel-challenge", async ({ message, toId }) => {
      try {
        const res = await NotificationModel.create({ message, to: toId });
        socket.to(toId).emit("cancel-challenge-response", {
          notification: res,
        });
      } catch (err) {
        console.log("cancel-challenge--err>>", err);
      }
    });

    socket.on("quick-accept", ({ toId, opponent, paymentOption, token }) => {
      console.log("quick-accept-->>", toId);
      socket
        .to(toId)
        .emit("quick-accept-response", { paymentOption, token, opponent });
    });

    socket.on("challenge-decline", async ({ message, to }) => {
      try {
        const res = await NotificationModel.create({ message, to });

        socket.to(to).emit("challenge-decline-response", { notification: res });
      } catch (err) {
        console.log("challenge-decline--err>>", err);
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
      }) => {
        const notification = new NotificationModel({ message, to });
        try {
          const res = await notification.save();
          socket.to(to).emit("notification", res);
          await ScheduleModel.create({
            date,
            challenger,
            challengerEmail,
            receiver,
            receiverEmail,
          });
        } catch (err) {
          console.log("challenge--err>>", err);
        }
      }
    );

    // notify users upon disconnection
    socket.on("disconnect", async () => {
      const matchingSockets = await socketIO.in(socket.userID).allSockets();
      const isDisconnected = matchingSockets.size === 0;
      if (isDisconnected) {
        // notify other users
        socket.broadcast.emit("user disconnected", socket.userID);
        // update the connection status of the session
        sessionStore.saveSession(socket.sessionID, {
          userID: socket.userID,
          username: socket.username,
          connected: false,
          status: "offline",
        });
      }
    });

    // Update status to 'Occupied' when user is challenging another user
    // socket.on("challenge", (data) => {
    //   console.log("Challenge-->>", data);

    //   socketIO.emit("challengeResponse", {
    //     user: data.receiver,
    //     challenger: data.challenger,
    //     challengerEmail: data.challengerEmail,
    //   });
    //   socketIO.emit("statusUpdate", {
    //     receiver: data.receiver,
    //     challenger: data.challenger,
    //     status: "Occupied",
    //   });
    // });
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

  cron.schedule("0 0 1 * *", async function () {
    try {
      await resetSeasonProperties();
      console.log("Season field reset successfully");
    } catch (err) {
      console.error("Failed to reset season field:", err);
    }
  });

  cron.schedule("0 0 * * *", async function () {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    try {
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

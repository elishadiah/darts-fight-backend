const UserModel = require("../models/user.model.js");
const NotificationModel = require("../models/notification.model.js");
const ResultModel = require("../models/result.model.js");
const ScheduleModel = require("../models/schedule.model.js");
const ScoreModel = require("../models/score.model.js");
const { updateXPAndRank } = require("../controllers/auth.controller.js");
const {
  createMatch,
  updateMatchScore,
  updateMatchFinish,
  updateBullScore,
} = require("../controllers/score.controller.js");
const { updateAchievements } = require("../controllers/result.controller.js");
const crypto = require("crypto");

const addMinutes = (date, minutes) => {
  const dateCopy = new Date(date);
  dateCopy.setMinutes(dateCopy.getMinutes() + minutes);
  return dateCopy;
};

const socketController = async (socket, socketIO, app) => {
  // console.log(`⚡: ${socket.username} user just connected!`);

  await UserModel.updateOne({ _id: socket.userID }, { status: "online" });

  socket.emit("user_id", { userID: socket.userID });
  socket.join(socket.userID);
  app.set("socketIo", socket);

  const users = await UserModel.find({
    status: { $in: ["online", "occupied"] },
  });
  socket.emit("users", users);

  socket.on("top-challenge", async ({ message, challenger, receiver }) => {
    try {
      const cUser = await UserModel.findOne({ username: challenger });
      const rUser = await UserModel.findOne({ username: receiver });

      if (cUser && rUser) {
        const notification = new NotificationModel({
          message,
          to: rUser._id.toString(),
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

        socket
          .to(rUser._id.toString())
          .emit("top-challenge-response", { notification });
      }
    } catch (err) {
      console.log("top-challenge--err-->>", err);
    }
  });

  NotificationModel.find({ to: socket.userID, read: false })
    .sort({ createdAt: -1 })
    .then((notifications) => {
      socket.emit("notifications", notifications);
    });

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
      await NotificationModel.updateMany({ to: socket.userID }, { read: true });
    } catch (err) {
      console.log("allNotificationsRead--err>>", err);
    }
  });

  // forward the private message to the right recipient (and to other tabs of the sender)
  socket.on(
    "challenge",
    async ({
      message,
      toId,
      fromId,
      to,
      from,
      paymentOption,
      scoringOption,
      type,
    }) => {
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
          scoringOption,
          type,
        });

        // const challenger = await UserModel.findOne({ username: from });
        updateXPAndRank(from, 20);
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

  socket.on(
    "quick-accept",
    async ({
      toId,
      opponent,
      challenger,
      paymentOption,
      scoringOption,
      token,
      type,
    }) => {
      try {
        if (scoringOption === "own") {
          await createMatch(challenger, opponent, token);
          // const user = await UserModel.findOne({ username: opponent });
          // socket.to(user._id.toString()).emit("quick-own-accept-response", {
          //   token,
          //   challenger,
          // });
        }

        if (type === "schedule") {
          socket.to(toId).emit("schedule-accept-response", {
            token,
            opponent,
            type,
            scoringOption,
          });
        } else {
          socket.to(toId).emit("quick-accept-response", {
            paymentOption,
            token,
            opponent,
            type,
            scoringOption,
          });
        }

        updateXPAndRank(opponent, 20);
      } catch (err) {
        console.log("quick--accept--error-->>", err);
      }
    }
  );

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
    "score-update",
    async ({ score, user, userId, opponent, opponentId, token }) => {
      try {
        const updatedMatch = await updateMatchScore(token, score, user);

        if (
          updatedMatch.legNo > 5 ||
          updatedMatch.p1.legs_won > 2 ||
          updatedMatch.p2.legs_won > 2
        ) {
          const finalMatch = await updateMatchFinish(token);
          console.log("finalMatch-->>", finalMatch);
          updateAchievements(finalMatch);
          socket.to(opponentId).emit("finish-match");
        } else {
          socket.to(opponentId).emit("score-update-response", {
            updatedMatch,
          });
        }
      } catch (err) {
        console.log("score-update--err>>", err);
      }
    }
  );

  socket.on("bull-score", async ({ score, username, opponentId, token }) => {
    try {
      const updatedMatch = await updateBullScore(token, score, username);
      socket.emit("bull-score-response", updatedMatch);
      socket.to(opponentId).emit("bull-score-response", updatedMatch);
    } catch (err) {
      console.log("bull-score--err->>", err);
    }
  });

  socket.on("match-finish", async ({ token, opponentId }) => {
    updateMatchFinish(token);
    socket.to(opponentId).emit("finish-match");
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

  socket.on("disconnect", async () => {
    try {
      const matchingSockets = await socketIO.in(socket.userID).allSockets();
      const isDisconnected = matchingSockets.size === 0;
      if (isDisconnected) {
        await UserModel.updateOne(
          { _id: socket.userID },
          { status: "offline" }
        );
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
};

module.exports = socketController;

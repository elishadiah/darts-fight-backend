const UserModel = require("../models/user.model.js");
const NotificationModel = require("../models/notification.model.js");
const ResultModel = require("../models/result.model.js");
const ScheduleModel = require("../models/schedule.model.js");
const { updateXPAndRank } = require("../controllers/auth.controller.js");
const crypto = require("crypto");
const cron = require("node-cron");

const addMinutes = (date, minutes) => {
  const dateCopy = new Date(date);
  dateCopy.setMinutes(dateCopy.getMinutes() + minutes);
  return dateCopy;
};

const socketController = (socket, sessionStore, socketIO, app) => {
  socket.on("connection", async (socket) => {
    console.log(`⚡: ${socket.username} user just connected!`);

    await UserModel.updateOne({ _id: socket.userID }, { status: "online" });

    socket.emit("user_id", { userID: socket.userID });
    socket.join(socket.userID);
    app.set("socketIo", socket);

    const users = await UserModel.find({
      status: { $in: ["online", "occupied"] },
    });
    socket.emit("users", users);

    // Define other socket event handlers here...
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

    socket.on(
      "quick-accept",
      async ({ toId, opponent, challenger, paymentOption, token }) => {
        console.log("quick-accept-->>", toId);
        socket
          .to(toId)
          .emit("quick-accept-response", { paymentOption, token, opponent });

        const user = await UserModel.findOne({ username: opponent });
        updateXPAndRank(user._id, 20);
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
  });
};

module.exports = socketController;

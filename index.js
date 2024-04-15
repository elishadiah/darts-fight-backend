const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http").Server(app);
const cron = require("node-cron");
const ScheduleModel = require("./models/schedule.model.js");
const {sendEmailNotification} = require("./email.js");

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

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

const randomId = () => crypto.randomBytes(8).toString("hex");

const { InMemorySessionStore } = require("./sessionStore.js");
const sessionStore = new InMemorySessionStore();

const { InMemoryMessageStore } = require("./messageStore");
const messageStore = new InMemoryMessageStore();

socketIO.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = sessionStore.findSession(sessionID);
    console.log('Session-->>>', session, sessionID, socket.handshake.auth)
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      return next();
    }
  }
  const username = socket.handshake.auth.username;
  console.log('username-->>>', username, socket.handshake.auth)
  if (!username) {
    return next(new Error("invalid username"));
  }
  socket.sessionID = socket.handshake.auth.sessionID;
  socket.userID = randomId();
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
  const messagesPerUser = new Map();
  messageStore.findMessagesForUser(socket.userID).forEach((message) => {
    const { from, to } = message;
    const otherUser = socket.userID === from ? to : from;
    if (messagesPerUser.has(otherUser)) {
      console.log('MBMBM-->>', message)
      messagesPerUser.get(otherUser).push(message);
    } else {
      console.log('MAMAM-->>', message)
      messagesPerUser.set(otherUser, [message]);
    }
  });
  sessionStore.findAllSessions().forEach((session) => {
    console.log('************************-------------------------------------', session)
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected,
      status: session.status,
      messages: messagesPerUser.get(session.userID) || [],
    });
  });
  socket.emit("users", users);

  console.log('*I*********************-->>', messagesPerUser)


  console.log('socket---->>>', users)

  // notify existing users
  socket.broadcast.emit("user connected", {
    userID: socket.userID,
    username: socket.username,
    connected: true,
    status: "online",
    messages: [],
  });

  // forward the private message to the right recipient (and to other tabs of the sender)
  socket.on("challenge", ({ content, to }) => {
    const message = {
      content,
      from: socket.userID,
      to,
    };
    console.log('Message-->>>', message)
    socket.to(to).to(socket.userID).emit("challenge", message);
    // socket.to(to).emit("challenge", message);
    messageStore.saveMessage(message);
  });

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

  // // Update status to 'Online' when user is connected
  // socket.on("new-user", (data) => {
  //   users.push(data);
  //   console.log("new-user-->>", data);
  //   socketIO.emit("statusUpdate", users);
  //   socketIO.emit("new-user-response", users);
  // });

  //   // Update status to 'Offline' when user is disconnected
  //   socket.on("disconnect", () => {
  //     console.log("🔥: A user disconnected: !!!");
  //     users = users.filter((val) => val.socketId !== socket.id);
  //     socketIO.emit("statusUpdate", users);
  //     socket.disconnect();
  //   });

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

  socket.on("schedule-challenge", async (data) => {
    console.log("schedule-challenge-->>", data);
    try {
      await ScheduleModel.create({
        date: data.date,
        challenger: data.challenger,
        challengerEmail: data.challengerEmail,
        receiver: data.receiver,
        receiverEmail: data.receiverEmail,
      });
    } catch (err) {
      console.log("schedule_save--->>>", err);
    }
    // socketIO.emit("schedule-challenge-response", {
    //   date: data.date,
    //   challenger: data.challenger,
    //   challengerEmail: data.challengerEmail,
    //   user: data.receiver,
    //   email: data.receiverEmail,
    // });
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

cron.schedule("* * * * *", async () => {
  try {
    const schedules = await ScheduleModel.find();
    schedules.map((item) => {
      if (
        new Date() > addMinutes(item.date, -240) &&
        new Date() < addMinutes(item.date, -238)
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
        new Date() > addMinutes(item.date, -5) &&
        new Date() < addMinutes(item.date, -3)
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

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("connected!"))
  .catch((error) => console.log(`${error} did not connect`));

app.get("/api", (req, res) => {
  res.json({ message: "Hello TTT" });
});
app.use("/auth", AuthRoute);
app.use("/avatar", AvatarRoute);
app.use("/result", ResultRoute);
app.use("/schedule", ScheduleRoute);
app.use("/event", EventRoute);

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

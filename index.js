const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http").Server(app);

const PORT = 4000;
const mongoURI =
  "mongodb+srv://diahelisha:51K8YoxU3k90C62J@darts-fight-database-4d8fe03d.mongo.ondigitalocean.com/admin";

// routes
const AuthRoute = require("./routes/auth.route.js");
const AvatarRoute = require("./routes/avatar.route.js");
const ResultRoute = require("./routes/result.route.js");
const ScheduleRoute = require("./routes/schedule.route.js");

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

let users = [];

socketIO.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  // Update status to 'Online' when user is connected
  socket.on("new-user", (data) => {
    users.push(data);
    console.log("new-user-->>", data);
    socketIO.emit("statusUpdate", users);
  });

  // Update status to 'Offline' when user is disconnected
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected: !!!");
    users = users.filter((val) => val.socketId !== socket.id);
    socketIO.emit("statusUpdate", users);
    socket.disconnect();
  });

  // Update status to 'Occupied' when user is challenging another user
  socket.on("challenge", (data) => {
    console.log("Challenge-->>", data);

    socketIO.emit("challengeResponse", {
      user: data.receiver,
      challenger: data.challenger,
      challengerEmail: data.challengerEmail,
    });
    socketIO.emit("statusUpdate", {
      receiver: data.receiver,
      challenger: data.challenger,
      status: "Occupied",
    });
  });

  socket.on("schedule-challenge", (data) => {
    console.log("schedule-challenge-->>", data);
    socketIO.emit("schedule-challenge-response", {
      date: data.date,
      challenger: data.challenger,
      challengerEmail: data.challengerEmail,
      user: data.receiver,
      email: data.receiverEmail,
    });
  });
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

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

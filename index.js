const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http").Server(app);

const PORT = 4000;
const mongoURI =
  "mongodb+srv://diahelisha:1j4pxHc3n7C0N968@darts-fight-database-4d8fe03d.mongo.ondigitalocean.com/admin";

// routes
const AuthRoute = require("./routes/auth.route.js");
const AvatarRoute = require("./routes/avatar.route.js");
const ResultRoute = require("./routes/result.route.js");

const socketIO = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());
// let users = [];

socketIO.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  //   socket.on("message", (data) => {
  //     socketIO.emit("messageResponse", data);
  //   });

  socket.on("challenge", (data) => {
    console.log("Challenge-->>", data);
    socketIO.emit("challengeResponse", {
      user: data.receiver,
      challenger: data.challenger,
    });
  });

  socket.emit("notification", {
    message: "Welcome to the Socket.IO notifications example",
  });

  //   socket.on("typing", (data) => socket.broadcast.emit("typingResponse", data));

  //   socket.on("newUser", (data) => {
  //     users.push(data);
  //     socketIO.emit("newUserResponse", users);
  //   });

  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected: !!!");
    //     users = users.filter((user) => user.socketID !== socket.id);
    //     socketIO.emit("newUserResponse", users);
    // socket.disconnect();
  });
});

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("connected!"))
  .catch((error) => console.log(`${error} did not connect`));

app.get("/api", (req, res) => {
  res.json({ message: "Hello" });
});
app.use("/auth", AuthRoute);
app.use("/avatar", AvatarRoute);
app.use("/result", ResultRoute);

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

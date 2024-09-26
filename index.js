const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const connectToMongoDB = require("./config/db.js");
const socketAuth = require("./middlewares/socketAuth.js");
const socketController = require("./controllers/socket.controller.js");
const scheduleTasks = require("./utils/scheduler.js");
const routes = require("./routes");

const app = express();
const server = http.Server(app);
const io = socketIO(server, { cors: { origin: "*" } });

const PORT = 4000;

connectToMongoDB().then(() => {
  console.log("connected!");
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  app.use(bodyParser.json({ limit: "30mb", extended: true }));
  app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
  app.use(cors());

  app.use("", routes);

  const { InMemorySessionStore } = require("./sessionStore.js");
  const sessionStore = new InMemorySessionStore();

  io.use(socketAuth);

  socketController(io, sessionStore, io);
  scheduleTasks();
});

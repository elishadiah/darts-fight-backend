const UserModel = require("../models/user.model.js");

const socketAuth = async (socket, next) => {
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
};

module.exports = socketAuth;

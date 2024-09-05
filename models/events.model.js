const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const matchSchema = new Schema({
  link: { type: String, default: null },
  user1Won: { type: Number, default: 0 },
  user2Won: { type: Number, default: 0 },
  achievements: { type: Array, default: [] },
});

const EventSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    eventType: {
      type: String,
      enum: [
        "register",
        "login",
        "logout",
        "schedule",
        "quick",
        "decline",
        "cancel",
        "match",
        "quick-token",
        "schedule-accept",
      ],
    },
    user: { type: String },
    targetUser: { type: String },
    match: {
      type: matchSchema,
      default: {
        link: null,
        user1Won: 0,
        user2Won: 0,
        achievements: [],
      },
    },
    token: { type: String, default: "" },
  },
  { timestamps: true }
);

const EventModel = mongoose.model("Event", EventSchema);
module.exports = EventModel;

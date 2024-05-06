const mongoose = require("mongoose");
const Schema = mongoose.Schema;

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
        "match",
      ],
    },
    user: { type: String },
    targetUser: { type: String },
    link: { type: String, default: null },
  },
  { timestamps: true }
);

const EventModel = mongoose.model("Event", EventSchema);
module.exports = EventModel;

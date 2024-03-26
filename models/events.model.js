const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EventSchema = new Schema(
  {
    date: { type: Date, default: Date.now },
    content: { type: String },
  },
  { timestamps: true }
);

const EventModel = mongoose.model("Event", EventSchema);
module.exports = EventModel;

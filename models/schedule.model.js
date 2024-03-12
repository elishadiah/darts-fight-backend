const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ScheduleSchema = new Schema(
  {
    date: { type: Date, required: true },
    challenger: { type: String, required: true },
    challengerEmail: { type: String, required: true },
    receiver: { type: String, required: true },
    receiverEmail: { type: String, required: true },
  },
  { timestamps: true }
);

const ScheduleModel = mongoose.model("Schedule", ScheduleSchema);
module.exports = ScheduleModel;

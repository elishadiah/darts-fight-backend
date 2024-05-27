const mongoose = require("mongoose");
const Schema = mongoose.Schema;

function getFirstDayOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getLastDayOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

const SeasonSchema = new Schema(
  {
    season: { type: Number, default: 1 },
    seasonStart: { type: Date, default: getFirstDayOfMonth },
    seasonEnd: { type: Date, default: getLastDayOfMonth },
    activeUsers: { type: Number, default: 0 },
    topMembers: [{ type: Schema.Types.ObjectId, ref: "Result" }],
  },
  { timestamps: true }
);

SeasonSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastSeason = await this.constructor.findOne().sort({ season: -1 });
    if (lastSeason) {
      this.season = lastSeason.season + 1;
    }
  }
  next();
});

const SeasonModel = mongoose.model("Season", SeasonSchema);
module.exports = SeasonModel;

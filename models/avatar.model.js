const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AvatarSchema = new Schema({
  title: String,
  avatar: String,
  imageId: String,
});

const AvatarModel = mongoose.model("Avatar", AvatarSchema);
module.exports = AvatarModel;

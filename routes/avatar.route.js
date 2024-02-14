const express = require("express");
const router = express.Router();
const AvatarModel = require("../models/avatar.model.js");
const Multer = require("multer");

// Image Upload configuration
// const storage = multer.diskStorage({
//   filename: function (req, file, callback) {
//     callback(null, Date.now() + file.originalname);
//   },
// });

// const imageFilter = function (req, file, cb) {
//   // accept image fils only
//   if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
//     return cb(new Error("Only image files are accepted!"), false);
//   }
//   cb(null, true);
// };

// const upload = multer({ storage: storage, fileFilter: imageFilter });

const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
});

const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: "dzlkznwgk", //ENTER YOUR CLOUDINARY NAME
  api_key: "429955448741395", // THIS IS COMING FROM CLOUDINARY WHICH WE SAVED FROM EARLIER
  api_secret: "B_nEanlrIsp9Hiy-zA8sjjemmU0", // ALSO COMING FROM CLOUDINARY WHICH WE SAVED EARLIER
});

async function handleUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
  });
  return res;
}

router.post("/upload", upload.single("avatar"), async (req, res) => {
  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    res.json(cldRes);
  } catch (error) {
    console.log(error);
    res.send({
      message: error.message,
    });
  }
});

module.exports = router;

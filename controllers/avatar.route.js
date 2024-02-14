const multer = require("multer");

// Image Upload configuration
const storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, Date.now() + file.originalname);
  },
});

const imageFilter = function (req, file, cb) {
  // accept image fils only
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
    return cb(new Error("Only image files are accepted!"), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter });
const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "dzlkznwgk", //ENTER YOUR CLOUDINARY NAME
  api_key: "429955448741395", // THIS IS COMING FROM CLOUDINARY WHICH WE SAVED FROM EARLIER
  api_secret: "B_nEanlrIsp9Hiy-zA8sjjemmU0", // ALSO COMING FROM CLOUDINARY WHICH WE SAVED EARLIER
});

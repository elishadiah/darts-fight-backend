const mongoose = require("mongoose");

const mongoURI =
  "mongodb+srv://diahelisha:51K8YoxU3k90C62J@darts-fight-database-4d8fe03d.mongo.ondigitalocean.com/admin";

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

module.exports = connectToMongoDB;

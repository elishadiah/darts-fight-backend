const CommunityModel = require("../models/community.model");

// Create a new community
const createCommunity = async (req, res) => {
  try {
    const newCommunity = new CommunityModel();
    const savedCommunity = await newCommunity.save();
    res.status(201).json(savedCommunity);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createCommunity };

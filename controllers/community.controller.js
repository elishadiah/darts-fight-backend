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

// Get community data
const getCommunity = async (req, res) => {
  try {
    const communities = await CommunityModel.find();
    const community = communities[0];
    if (!community) {
      throw new Error("Community not found");
    }

    res.status(200).json(communities);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// Update Community
const updateCommunity = async (req, res) => {
  const { player1, player2 } = req.body;

  const communities = await CommunityModel.find();
  const community = communities[0];
  if (!community) {
    throw new Error("Community not found");
  }

  // Update participantsWeek
  if (!community.participantsWeek.includes(username)) {
    community.participantsWeek.push(username);
  }

  // Update fightsCntDay
  community.fightsCntDay += 1;

  // Update participantsDay
  if (!community.participantsDay.includes(result.participant)) {
    community.participantsDay.push(result.participant);
  }

  // Save the updated community document
  await community.save();
};

module.exports = { createCommunity, getCommunity, updateCommunity };

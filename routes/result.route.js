const express = require("express");
const {
  getLidartsResult,
  postResult,
  fetchResult,
  fetchAllResults,
  addField,
  inactiveUser,
  adminUpdateResult,
  migrateField,
  bulkActivateUsers,
  fetchAllResultsAndUsers,
  jacksVictoryAchievement,
  finishMatchAPI,
} = require("../controllers/result.controller.js");

const router = express.Router();

router.get("/lidart-get", getLidartsResult);
router.post('/post', postResult);
router.post('/fetch', fetchResult);
router.get('/fetch-all', fetchAllResults);
router.post('/add-field', addField);
router.post('/inactive', inactiveUser);
router.post('/admin-update', adminUpdateResult);
router.post('/migrate', migrateField);
router.post('/bulk-activate', bulkActivateUsers);
router.get('/fetch-all-results-and-users', fetchAllResultsAndUsers);
router.post('/jacks-victory', jacksVictoryAchievement);

router.post('/finish-match', finishMatchAPI);

module.exports = router;

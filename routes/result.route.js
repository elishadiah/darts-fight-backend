const express = require("express");
const {
  getResult,
  postResult,
  getSubResult,
  fetchResult,
  fetchAllResult,
  addField,
  inactiveUser,
  adminUpdateResult,
  migrateField,
  bulkActivateUsers,
  fetchAllResultsAndUsers,
} = require("../controllers/result.controller.js");

const router = express.Router();

router.post("/detail", getSubResult);
router.get("/get", getResult);
router.post('/post', postResult);
router.post('/fetch', fetchResult);
router.get('/fetch-all', fetchAllResult);
router.post('/add-field', addField);
router.post('/inactive', inactiveUser);
router.post('/admin-update', adminUpdateResult);
router.post('/migrate', migrateField);
router.post('/bulk-activate', bulkActivateUsers);
router.get('/fetch-all-results-and-users', fetchAllResultsAndUsers);

module.exports = router;

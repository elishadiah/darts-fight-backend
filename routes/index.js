const express = require("express");
const AuthRoute = require("./auth.route.js");
const AvatarRoute = require("./avatar.route.js");
const ResultRoute = require("./result.route.js");
const ScheduleRoute = require("./schedule.route.js");
const EventRoute = require("./event.route.js");
const NotificationRoute = require("./notification.route.js");
const SeasonRoute = require("./season.route.js");
const ArenaRoute = require("./arena.route.js");
const CommunityRoute = require("./community.route.js");
const ScoreRoute = require("./score.route.js");

const router = express.Router();

router.use("/auth", AuthRoute);
router.use("/avatar", AvatarRoute);
router.use("/result", ResultRoute);
router.use("/schedule", ScheduleRoute);
router.use("/event", EventRoute);
router.use("/notification", NotificationRoute);
router.use("/season", SeasonRoute);
router.use("/arena", ArenaRoute);
router.use("/community", CommunityRoute);
router.use("/score", ScoreRoute);

module.exports = router;
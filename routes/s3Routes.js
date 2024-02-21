const express = require("express");
const authController = require("../controllers/authController");
const s3Controllr = require("../controllers/s3Controller");

const router = express.Router();

router.use(authController.protect);

router.route("/url").get(s3Controllr.getPresignedUrlToUpload);

module.exports = router;

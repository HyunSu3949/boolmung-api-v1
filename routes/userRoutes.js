const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.use(authController.protect);

router.get("/me", userController.getMe, userController.getUser);

router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);

router.delete("/deleteMe", userController.deleteMe);

router.route("/").get(userController.getAllUsers);

module.exports = router;

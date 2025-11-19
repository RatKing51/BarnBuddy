const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const auth = require("../middleware/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);

// Example protected route
router.get("/me", auth, authController.me);

module.exports = router;

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller"); // Make sure path is correct
const authMiddleware = require("../middleware/auth")

// Routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.me);

module.exports = router;

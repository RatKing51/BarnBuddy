const express = require("express");
const { clerkClient } = require("@clerk/express");
const authMiddleware = require("../middleware/authMiddleware");
const { deleteUserDataByUserId } = require("../services/deleteUserData");
const { getUserPreferences, updateUserPreferences } = require("../services/userPreferences");
require("dotenv").config();


const router = express.Router();

router.post("/signup", (req, res) => {
    res.status(410).json({ error: "Sign up is handled by Clerk." });
})

router.post("/login", (req, res) => {
    res.status(410).json({ error: "Login is handled by Clerk." });
})

router.get("/me", authMiddleware, async (req, res) => {
    const preferences = await getUserPreferences(req.user.id);

    res.json({
        message: 'You are auth',
        user: req.user,
        preferences,
    });
});

router.get("/preferences", authMiddleware, async (req, res) => {
    try {
        const preferences = await getUserPreferences(req.user.id);
        res.json(preferences);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load preferences" });
    }
});

router.patch("/preferences", authMiddleware, async (req, res) => {
    try {
        const preferences = await updateUserPreferences(req.user.id, req.body);
        res.json(preferences);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save preferences" });
    }
});

router.delete("/me", authMiddleware, async (req, res) => {
    try {
        const user = await deleteUserDataByUserId(req.user.id);

        if (!user) {
            return res.status(404).json({ error: "User not found"});
        }

        if (req.user.clerkUserId) {
            await clerkClient.users.deleteUser(req.user.clerkUserId);
        }
        
        res.json({ message: "User account deleted successfully", user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete user" });
    }
})

// Exporting
module.exports = router

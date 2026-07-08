const express = require("express");
const { clerkClient } = require("@clerk/express");
const authMiddleware = require("../middleware/authMiddleware");
const { deleteUserDataByUserId } = require("../services/deleteUserData");
const { getUserPreferences, updateUserPreferences } = require("../services/userPreferences");
const pool = require("../data-source");
require("dotenv").config();


const router = express.Router();
const userTypeOptions = new Set([
    "Small breeder",
    "FFA / 4-H student",
    "Hobby farm",
    "Larger herd",
    "School or chapter",
    "Just trying it out",
]);
const speciesOptions = new Set(["Cattle", "Goats", "Sheep", "Pigs", "Horses", "Poultry", "Rabbits", "Other"]);
const herdSizeOptions = new Set(["1-5", "6-20", "21-50", "51-100", "100+"]);
const mainGoalOptions = new Set([
    "Remember health records",
    "Track breeding and birth records",
    "Track weights and growth",
    "Manage show animals",
    "Keep sale/buyer records",
    "Organize everything in one place",
    "Not sure yet",
]);
const setupModeOptions = new Set(["Add one animal now", "Import existing records", "Explore the dashboard first"]);

function asOption(value, options, fallback = "") {
    return options.has(value) ? value : fallback;
}

function asSpeciesList(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item) => speciesOptions.has(item)))];
}

function onboardingResponse(row = {}) {
    return {
        required: row.onboarding_required === true,
        completed: row.onboarding_completed === true,
        userType: row.user_type || "",
        primarySpecies: Array.isArray(row.primary_species) ? row.primary_species : [],
        herdSizeRange: row.herd_size_range || "",
        mainGoal: row.main_goal || "",
        setupMode: row.setup_mode || "",
        createdFirstAnimal: row.created_first_animal === true,
    };
}

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

router.patch("/onboarding", authMiddleware, async (req, res) => {
    try {
        const completed = req.body.completed === true;
        const setupMode = asOption(req.body.setupMode, setupModeOptions, completed ? "Explore the dashboard first" : "");
        const primarySpecies = asSpeciesList(req.body.primarySpecies);

        const result = await pool.query(
            `UPDATE users
             SET onboarding_completed = CASE WHEN $1::boolean THEN true ELSE onboarding_completed END,
                 onboarding_required = CASE WHEN $1::boolean THEN false ELSE onboarding_required END,
                 user_type = COALESCE(NULLIF($2, ''), user_type),
                 primary_species = CASE WHEN cardinality($3::text[]) > 0 THEN $3::text[] ELSE primary_species END,
                 herd_size_range = COALESCE(NULLIF($4, ''), herd_size_range),
                 main_goal = COALESCE(NULLIF($5, ''), main_goal),
                 setup_mode = COALESCE(NULLIF($6, ''), setup_mode),
                 created_first_animal = CASE WHEN $7::boolean THEN true ELSE created_first_animal END
             WHERE id = $8
             RETURNING onboarding_required, onboarding_completed, user_type, primary_species, herd_size_range, main_goal, setup_mode, created_first_animal`,
            [
                completed,
                asOption(req.body.userType, userTypeOptions),
                primarySpecies,
                asOption(req.body.herdSizeRange, herdSizeOptions),
                asOption(req.body.mainGoal, mainGoalOptions),
                setupMode,
                req.body.createdFirstAnimal === true,
                req.user.id,
            ]
        );

        res.json({ onboarding: onboardingResponse(result.rows[0]) });
    } catch (err) {
        console.error("Failed to save onboarding:", err);
        res.status(500).json({ error: "Failed to save onboarding" });
    }
});

router.post("/onboarding/restart", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE users
             SET onboarding_required = true,
                 onboarding_completed = false
             WHERE id = $1
             RETURNING onboarding_required, onboarding_completed, user_type, primary_species, herd_size_range, main_goal, setup_mode, created_first_animal`,
            [req.user.id]
        );

        res.json({ onboarding: onboardingResponse(result.rows[0]) });
    } catch (err) {
        console.error("Failed to restart onboarding:", err);
        res.status(500).json({ error: "Failed to restart onboarding" });
    }
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
        if (req.body?.automaticReminders === true && !req.user.subscription?.isPremium) {
            return res.status(403).json({
                error: "Premium is required for automatic reminders.",
                subscription: req.user.subscription || null,
            });
        }

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

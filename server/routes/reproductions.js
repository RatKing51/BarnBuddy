const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get all reproductions for logged in user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM reproductions WHERE user_id = $1 ORDER BY breeding_date DESC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch reproductions" });
    }
});

// Get reproductions for a specific animal (either as dam or sire)
router.get("/animal/:animalId", authMiddleware, async (req, res) => {
    const { animalId } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM reproductions WHERE user_id = $1 AND (dam_id = $2 OR sire_id = $2) ORDER BY breeding_date DESC",
            [req.user.id, animalId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch animal reproductions" });
    }
});

// Create a new reproduction event
router.post("/", authMiddleware, async (req, res) => {
    const { dam_id, sire_id, breeding_date, due_date, outcome, notes } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO reproductions
            (user_id, dam_id, sire_id, breeding_date, due_date, outcome, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [req.user.id, dam_id, sire_id, breeding_date, due_date, outcome, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create reproduction" });
    }
});

// Update a reproduction event
router.put("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { dam_id, sire_id, breeding_date, due_date, outcome, notes } = req.body;

    try {
        const result = await pool.query(
            `UPDATE reproductions SET
            dam_id = $1, sire_id = $2, breeding_date = $3, due_date = $4,
            outcome = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7 AND user_id = $8
            RETURNING *`,
            [dam_id, sire_id, breeding_date, due_date, outcome, notes, id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Reproduction not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update reproduction" });
    }
});

// Delete a reproduction event
router.delete("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM reproductions WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Reproduction not found" });
        res.json({ message: "Reproduction deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete reproduction" });
    }
});

module.exports = router;
const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensureReproductionSchema } = require("../services/ensureAppSchema");

const router = express.Router();

function nullableDate(value) {
    return value ? value : null;
}

function nullableId(value) {
    return value ? Number(value) : null;
}

function requirePremium(req, res) {
    if (!req.user.subscription?.isPremium) {
        res.status(403).json({
            error: "Premium is required for reproduction records.",
            subscription: req.user.subscription || null,
        });
        return false;
    }

    return true;
}

// Get all reproductions for logged in user
router.get("/", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    try {
        await ensureReproductionSchema();
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
    if (!requirePremium(req, res)) return;

    const { animalId } = req.params;
    try {
        await ensureReproductionSchema();
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
    if (!requirePremium(req, res)) return;

    const {
        dam_id,
        sire_id,
        breeding_date,
        due_date,
        outcome,
        breeding_method,
        pregnancy_check_date,
        pregnancy_status,
        birth_date,
        offspring_count,
        birth_outcome,
        notes,
    } = req.body;

    try {
        await ensureReproductionSchema();
        const result = await pool.query(
            `INSERT INTO reproductions
            (user_id, dam_id, sire_id, breeding_date, due_date, outcome, breeding_method, pregnancy_check_date, pregnancy_status, birth_date, offspring_count, birth_outcome, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                req.user.id,
                nullableId(dam_id),
                nullableId(sire_id),
                nullableDate(breeding_date),
                nullableDate(due_date),
                outcome || "Planned",
                breeding_method || "",
                nullableDate(pregnancy_check_date),
                pregnancy_status || "",
                nullableDate(birth_date),
                offspring_count === "" || offspring_count === undefined ? null : Number(offspring_count),
                birth_outcome || "",
                notes || "",
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create reproduction" });
    }
});

// Update a reproduction event
router.put("/:id", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    const { id } = req.params;
    const {
        dam_id,
        sire_id,
        breeding_date,
        due_date,
        outcome,
        breeding_method,
        pregnancy_check_date,
        pregnancy_status,
        birth_date,
        offspring_count,
        birth_outcome,
        notes,
    } = req.body;

    try {
        await ensureReproductionSchema();
        const result = await pool.query(
            `UPDATE reproductions SET
            dam_id = $1, sire_id = $2, breeding_date = $3, due_date = $4,
            outcome = $5, breeding_method = $6, pregnancy_check_date = $7,
            pregnancy_status = $8, birth_date = $9, offspring_count = $10,
            birth_outcome = $11, notes = $12, updated_at = CURRENT_TIMESTAMP
            WHERE id = $13 AND user_id = $14
            RETURNING *`,
            [
                nullableId(dam_id),
                nullableId(sire_id),
                nullableDate(breeding_date),
                nullableDate(due_date),
                outcome || "Planned",
                breeding_method || "",
                nullableDate(pregnancy_check_date),
                pregnancy_status || "",
                nullableDate(birth_date),
                offspring_count === "" || offspring_count === undefined ? null : Number(offspring_count),
                birth_outcome || "",
                notes || "",
                id,
                req.user.id,
            ]
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
    if (!requirePremium(req, res)) return;

    const { id } = req.params;

    try {
        await ensureReproductionSchema();
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

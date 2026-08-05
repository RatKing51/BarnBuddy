const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensureReproductionSchema } = require("../services/ensureAppSchema");
const { normalizeReproductionPayload } = require("../utils/recordPayloads");
const { sendRouteError } = require("../utils/routeErrors");

const router = express.Router();

async function validateOwnedParents(userId, damId, sireId) {
    if (damId && sireId && damId === sireId) return "Dam and sire must be different animals.";
    const parentIds = [...new Set([damId, sireId].filter(Boolean))];
    if (!parentIds.length) return "";

    const result = await pool.query(
        "SELECT id FROM animals WHERE user_id = $1 AND id = ANY($2::int[])",
        [userId, parentIds]
    );
    return result.rowCount === parentIds.length ? "" : "One or more selected parents were not found.";
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
        sendRouteError(res, err, "Failed to fetch reproductions");
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
        sendRouteError(res, err, "Failed to fetch animal reproductions");
    }
});

// Create a new reproduction event
router.post("/", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    const normalized = normalizeReproductionPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const event = normalized.value;

    try {
        await ensureReproductionSchema();
        const ownershipError = await validateOwnedParents(req.user.id, event.damId, event.sireId);
        if (ownershipError) return res.status(400).json({ error: ownershipError });
        const result = await pool.query(
            `INSERT INTO reproductions
            (user_id, dam_id, sire_id, breeding_date, due_date, outcome, breeding_method, pregnancy_check_date, pregnancy_status, birth_date, offspring_count, birth_outcome, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                req.user.id,
                event.damId,
                event.sireId,
                event.breedingDate,
                event.dueDate,
                event.outcome,
                event.breedingMethod,
                event.pregnancyCheckDate,
                event.pregnancyStatus,
                event.birthDate,
                event.offspringCount,
                event.birthOutcome,
                event.notes,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        sendRouteError(res, err, "Failed to create reproduction");
    }
});

// Update a reproduction event
router.put("/:id", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    const { id } = req.params;
    const normalized = normalizeReproductionPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const event = normalized.value;

    try {
        await ensureReproductionSchema();
        const ownershipError = await validateOwnedParents(req.user.id, event.damId, event.sireId);
        if (ownershipError) return res.status(400).json({ error: ownershipError });
        const result = await pool.query(
            `UPDATE reproductions SET
            dam_id = $1, sire_id = $2, breeding_date = $3, due_date = $4,
            outcome = $5, breeding_method = $6, pregnancy_check_date = $7,
            pregnancy_status = $8, birth_date = $9, offspring_count = $10,
            birth_outcome = $11, notes = $12, updated_at = CURRENT_TIMESTAMP
            WHERE id = $13 AND user_id = $14
            RETURNING *`,
            [
                event.damId,
                event.sireId,
                event.breedingDate,
                event.dueDate,
                event.outcome,
                event.breedingMethod,
                event.pregnancyCheckDate,
                event.pregnancyStatus,
                event.birthDate,
                event.offspringCount,
                event.birthOutcome,
                event.notes,
                id,
                req.user.id,
            ]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Reproduction not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        sendRouteError(res, err, "Failed to update reproduction");
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
        sendRouteError(res, err, "Failed to delete reproduction");
    }
});

module.exports = router;

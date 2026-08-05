const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensureBirthSchema } = require("../services/ensureAppSchema");
const { normalizeBirthPayload } = require("../utils/recordPayloads");
const { sendRouteError } = require("../utils/routeErrors");

const router = express.Router();

async function validateOwnedBirthReferences(userId, reproductionId, offspringId) {
    if (reproductionId) {
        const reproduction = await pool.query(
            "SELECT id FROM reproductions WHERE id = $1 AND user_id = $2",
            [reproductionId, userId]
        );
        if (!reproduction.rowCount) return "Selected reproduction record was not found.";
    }

    if (offspringId) {
        const offspring = await pool.query(
            "SELECT id FROM animals WHERE id = $1 AND user_id = $2",
            [offspringId, userId]
        );
        if (!offspring.rowCount) return "Selected offspring animal was not found.";
    }

    return "";
}

function requirePremium(req, res) {
    if (!req.user.subscription?.isPremium) {
        res.status(403).json({
            error: "Premium is required for reproduction birth records.",
            subscription: req.user.subscription || null,
        });
        return false;
    }

    return true;
}

// Get all births for logged in user
router.get("/", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    try {
        await ensureBirthSchema();
        const result = await pool.query(
            `SELECT b.*, a.name as offspring_name, a.sex as offspring_sex,
                    r.breeding_date, r.outcome,
                    dam.name as dam_name, sire.name as sire_name
             FROM births b
             LEFT JOIN animals a ON b.offspring_id = a.id AND a.user_id = b.user_id
             LEFT JOIN reproductions r ON b.reproduction_id = r.id AND r.user_id = b.user_id
             LEFT JOIN animals dam ON r.dam_id = dam.id AND dam.user_id = b.user_id
             LEFT JOIN animals sire ON r.sire_id = sire.id AND sire.user_id = b.user_id
             WHERE b.user_id = $1
             ORDER BY b.birth_date DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        sendRouteError(res, err, "Failed to fetch births");
    }
});

// Get births for a specific animal (as offspring, dam, or sire)
router.get("/animal/:animalId", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    const { animalId } = req.params;
    try {
        await ensureBirthSchema();
        // Get births where animal is offspring
        const offspringResult = await pool.query(
            `SELECT b.*, a.name as offspring_name, a.sex as offspring_sex,
                    r.breeding_date, r.outcome,
                    dam.name as dam_name, sire.name as sire_name
             FROM births b
             LEFT JOIN animals a ON b.offspring_id = a.id AND a.user_id = b.user_id
             LEFT JOIN reproductions r ON b.reproduction_id = r.id AND r.user_id = b.user_id
             LEFT JOIN animals dam ON r.dam_id = dam.id AND dam.user_id = b.user_id
             LEFT JOIN animals sire ON r.sire_id = sire.id AND sire.user_id = b.user_id
             WHERE b.user_id = $1 AND b.offspring_id = $2`,
            [req.user.id, animalId]
        );

        // Get births where animal is dam (mother)
        const damResult = await pool.query(
            `SELECT b.*, a.name as offspring_name, a.sex as offspring_sex,
                    r.breeding_date, r.outcome,
                    dam.name as dam_name, sire.name as sire_name
             FROM births b
             LEFT JOIN animals a ON b.offspring_id = a.id AND a.user_id = b.user_id
             LEFT JOIN reproductions r ON b.reproduction_id = r.id AND r.user_id = b.user_id
             LEFT JOIN animals dam ON r.dam_id = dam.id AND dam.user_id = b.user_id
             LEFT JOIN animals sire ON r.sire_id = sire.id AND sire.user_id = b.user_id
             WHERE b.user_id = $1 AND r.dam_id = $2`,
            [req.user.id, animalId]
        );

        // Get births where animal is sire (father)
        const sireResult = await pool.query(
            `SELECT b.*, a.name as offspring_name, a.sex as offspring_sex,
                    r.breeding_date, r.outcome,
                    dam.name as dam_name, sire.name as sire_name
             FROM births b
             LEFT JOIN animals a ON b.offspring_id = a.id AND a.user_id = b.user_id
             LEFT JOIN reproductions r ON b.reproduction_id = r.id AND r.user_id = b.user_id
             LEFT JOIN animals dam ON r.dam_id = dam.id AND dam.user_id = b.user_id
             LEFT JOIN animals sire ON r.sire_id = sire.id AND sire.user_id = b.user_id
             WHERE b.user_id = $1 AND r.sire_id = $2`,
            [req.user.id, animalId]
        );

        res.json({
            asOffspring: offspringResult.rows,
            asDam: damResult.rows,
            asSire: sireResult.rows
        });
    } catch (err) {
        console.error(err);
        sendRouteError(res, err, "Failed to fetch animal births");
    }
});

// Create a new birth record
router.post("/", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    const normalized = normalizeBirthPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const birth = normalized.value;

    try {
        await ensureBirthSchema();
        const ownershipError = await validateOwnedBirthReferences(req.user.id, birth.reproductionId, birth.offspringId);
        if (ownershipError) return res.status(400).json({ error: ownershipError });
        const result = await pool.query(
            `INSERT INTO births
            (user_id, reproduction_id, offspring_id, birth_date, birth_weight, birth_notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.user.id,
                birth.reproductionId,
                birth.offspringId,
                birth.birthDate,
                birth.birthWeight,
                birth.birthNotes,
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        sendRouteError(res, err, "Failed to create birth record");
    }
});

// Update a birth record
router.put("/:id", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    const { id } = req.params;
    const normalized = normalizeBirthPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const birth = normalized.value;

    try {
        await ensureBirthSchema();
        const ownershipError = await validateOwnedBirthReferences(req.user.id, birth.reproductionId, birth.offspringId);
        if (ownershipError) return res.status(400).json({ error: ownershipError });
        const result = await pool.query(
            `UPDATE births SET
            reproduction_id = $1, offspring_id = $2, birth_date = $3,
            birth_weight = $4, birth_notes = $5
            WHERE id = $6 AND user_id = $7
            RETURNING *`,
            [
                birth.reproductionId,
                birth.offspringId,
                birth.birthDate,
                birth.birthWeight,
                birth.birthNotes,
                id,
                req.user.id,
            ]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Birth record not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        sendRouteError(res, err, "Failed to update birth record");
    }
});

// Delete a birth record
router.delete("/:id", authMiddleware, async (req, res) => {
    if (!requirePremium(req, res)) return;

    const { id } = req.params;

    try {
        await ensureBirthSchema();
        const result = await pool.query(
            "DELETE FROM births WHERE id = $1 AND user_id = $2 RETURNING *",
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Birth record not found" });
        res.json({ message: "Birth record deleted successfully" });
    } catch (err) {
        console.error(err);
        sendRouteError(res, err, "Failed to delete birth record");
    }
});

module.exports = router;

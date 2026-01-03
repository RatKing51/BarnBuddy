const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create Visit
router.post("/", authMiddleware, async (req, res) => {
    const {
        animal_id,
        vet_name,
        visit_date,
        reason,
        treatment,
        medications,
        follow_up_date,
        cost,
        notes
    } = req.body;

    try {
        // making sure the animal is owned by the user
        const animalCheck = await pool.query(
            "SELECT id FROM animals WHERE id=$1 AND user_id=$2",
            [animal_id, req.user.id]
        );

        if (animalCheck.rowCount === 0) {
            return res.status(403).json({ error: "Unauthorized animnal access" });
        }

        const result = await pool.query(
            `INSERT INTO vet_visits
            (animal_id, vet_name, visit_date, reason, treatment, medications, follow_up_date, cost, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            `,
            [
                animal_id,
                vet_name,
                visit_date,
                reason,
                treatment,
                medications,
                follow_up_date,
                cost,
                notes
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create vet visit" });
    }
});

// Get all for an animal
router.get("/animal/:animalId", authMiddleware, async (req, res) => {
    const { animalId } = req.params;

    try {
        const result = await pool.query(
            `
            SELECT vv.*
            FROM vet_visits vv
            JOIN animals a ON vv.animal_id = a.id
            WHERE a.id=$1 AND a.user_id=$2
            ORDER BY visit_date DESC
            `,
            [animalId, req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch vet visits" });
    }
});

// get single vet visit
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT vv.*
            FROM vet_visits vv
            JOIN animals a ON vv.animal_id = a.id
            WHERE vv.id=$1 AND a.user_id=$2
            `,
            [req.params.id, req.user.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Vet visit not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch vet visit" });
    }
});

// update single vet visit
router.put("/:id", authMiddleware, async (req, res) => {
    const {
        vet_name,
        visit_date,
        reason,
        treatment,
        medications,
        follow_up_date,
        cost,
        notes
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE vet_visits vv
            SET vet_name=$1,
                visit_date=$2,
                reason=$3,
                treatment=$4,
                medications=$5,
                follow_up_date=$6,
                cost=$7,
                notes=$8
            FROM animals a
            WHERE vv.id=$9
              AND vv.animal_id = a.id
              AND a.user_id=$10
            RETURNING vv.*`,
            [
                vet_name,
                visit_date,
                reason,
                treatment,
                medications,
                follow_up_date,
                cost,
                notes,
                req.params.id,
                req.user.id
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Vet visit not found or unauthorized" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error editing vet visit" });
    }
});

// Deleting vet visit
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM vet_visits vv
            USING animals a
            WHERE vv.animal_id = a.id
              AND vv.id=$1
              AND a.user_id=$2
            RETURNING vv.id`,
            [req.params.id, req.user.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Vet visit not found or unauthorized" });
        }

        res.json({ message: "Vet visit deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete vet visit" });
    }
})

module.exports = router;
const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// create health event
router.post("/", authMiddleware, async (req, res) => {
    const {
        animal_id,
        event_date,
        type,
        description,
        severity,
        resolved,
        notes
    } = req.body;

    try {
        // ownership check
        const animalCheck = await pool.query(
            "SELECT id FROM animals WHERE id=$1 AND user_id=$2",
            [animal_id, req.user.id]
        );

        if (!animalCheck.rowCount) {
            return res.status(403).json({ error: "Unauthorized animal access" });
        }

        const result = await pool.query(
            `INSERT INTO health_events
            (animal_id, event_date, type, description, severity, resolved, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *`,
            [
                animal_id,
                event_date,
                type,
                description,
                severity,
                resolved ?? false,
                notes
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create health event" });
    }
});

// Get all for one animal
router.get("/animal/:animalId", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT he.*
            FROM health_events he
            JOIN animals a ON he.animal_id = a.id
            WHERE a.id=$1 AND a.user_id=$2
            ORDER BY event_date DESC`,
            [req.params.animalId, req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch health events" });
    }
});

// Get for a single event
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT he.*
            FROM health_events he
            JOIN animals a ON he.animal_id = a.id
            WHERE he.id=$1 AND a.user_id=$2`,
            [req.params.id, req.user.id]
        )

        if (!result.rows.length) {
            return res.status(404).json({ error: "Health event not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch health event" });
    }
});

// Update health event
router.put("/:id", authMiddleware, async (req, res) => {
    const {
        event_date,
        type,
        description,
        severity,
        resolved,
        notes
    } = req.body;

    try {
         const result = await pool.query(
            `UPDATE health_events he
            SET event_date=$1,
                type=$2,
                description=$3,
                severity=$4,
                resolved=$5,
                notes=$6
            FROM animals a 
            WHERE he.id=$7
              AND he.animal_id = a.id
              AND a.user_id=$8
            RETURNING he.*`,
            [
                event_date,
                type,
                description,
                severity,
                resolved,
                notes,
                req.params.id,
                req.user.id
            ]
         );

         if (!result.rows.length) {
            return res.status(404).json({ error: "Health event not found or unauthorized" });
         }
         
         res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update health event" });
    }
});

// delete health event
router.delete("/:id" , authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM health_events he
            USING animals a
            WHERE he.animal_id = a.id
              AND he.id=$1
              AND a.user_id=$2
            RETURNING he.id`,
            [req.params.id, req.user.id]
        );
        
        if (!result.rows.length) {
            return res.status(404).json({ error: "Health event not found or not authorized" });
        }

        res.json({ message: "Health event deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete health event"});
    }
});

module.exports = router;
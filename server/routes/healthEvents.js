const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function normalizeAnimalIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
        value
            .map((id) => Number.parseInt(id, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];
}

// Create the same health event for multiple owned animals.
router.post("/bulk", authMiddleware, async (req, res) => {
    const animalIds = normalizeAnimalIds(req.body.animal_ids);
    const {
        event_date,
        type,
        description,
        severity,
        resolved,
        notes
    } = req.body;

    if (!animalIds.length) {
        return res.status(400).json({ error: "Select at least one animal" });
    }
    if (animalIds.length > 500) {
        return res.status(400).json({ error: "Bulk entries are limited to 500 animals" });
    }
    if (!event_date) {
        return res.status(400).json({ error: "Event date is required" });
    }
    if (!String(type || "").trim()) {
        return res.status(400).json({ error: "Event type is required" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const ownedAnimals = await client.query(
            `SELECT id
             FROM animals
             WHERE user_id = $1
               AND id = ANY($2::int[])`,
            [req.user.id, animalIds]
        );

        if (ownedAnimals.rowCount !== animalIds.length) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "One or more selected animals are unavailable" });
        }

        const result = await client.query(
            `INSERT INTO health_events
             (animal_id, event_date, type, description, severity, resolved, notes)
             SELECT animal_id, $2, $3, $4, $5, $6, $7
             FROM unnest($1::int[]) AS selected(animal_id)
             RETURNING *`,
            [
                animalIds,
                event_date,
                String(type).trim(),
                description || "",
                severity || "Low",
                resolved ?? false,
                notes || ""
            ]
        );

        await client.query("COMMIT");
        res.status(201).json({ count: result.rowCount, records: result.rows });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Failed to create bulk health events" });
    } finally {
        client.release();
    }
});

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

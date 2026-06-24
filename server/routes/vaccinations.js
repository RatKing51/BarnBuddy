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

// Create the same vaccination record for multiple owned animals.
router.post("/bulk", authMiddleware, async (req, res) => {
    const animalIds = normalizeAnimalIds(req.body.animal_ids);
    const {
        vaccine_name,
        date_given,
        next_due_date,
        dosage,
        notes
    } = req.body;

    if (!animalIds.length) {
        return res.status(400).json({ error: "Select at least one animal" });
    }
    if (animalIds.length > 500) {
        return res.status(400).json({ error: "Bulk entries are limited to 500 animals" });
    }
    if (!String(vaccine_name || "").trim()) {
        return res.status(400).json({ error: "Vaccine name is required" });
    }
    if (!date_given) {
        return res.status(400).json({ error: "Date given is required" });
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
            `INSERT INTO vaccinations
             (animal_id, vaccine_name, date_given, next_due_date, dosage, notes)
             SELECT animal_id, $2, $3, $4, $5, $6
             FROM unnest($1::int[]) AS selected(animal_id)
             RETURNING *`,
            [
                animalIds,
                String(vaccine_name).trim(),
                date_given,
                next_due_date || null,
                dosage || null,
                notes || ""
            ]
        );

        await client.query("COMMIT");
        res.status(201).json({ count: result.rowCount, records: result.rows });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Failed to create bulk vaccinations" });
    } finally {
        client.release();
    }
});

// Get vaccinations for one animal
router.get("/animal/:animalId", authMiddleware, async (req, res) => {
    const { animalId } = req.params;

    try {
        const result = await pool.query(
            `
            SELECT v.*
            FROM vaccinations v
            JOIN animals a ON v.animal_id = a.id
            WHERE v.animal_id = $1
                AND a.user_id = $2
            ORDER BY v.date_given DESC
             `,
            [animalId, req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch vaccinations" });
    }
});

// create a vaccination
router.post("/", authMiddleware, async (req, res) =>{
    const {
        animal_id,
        vaccine_name,
        date_given,
        next_due_date,
        dosage,
        notes
    } = req.body;

    try {
        const animalCheck = await pool.query(
            "SELECT id FROM animals WHERE id = $1 AND user_id = $2",
            [animal_id, req.user.id]
        );
        if (!animalCheck.rowCount) {
            return res.status(403).json({ error: "Unauthorized animal access" });
        }

        const result = await pool.query(
            `
            INSERT INTO vaccinations
            (animal_id, vaccine_name, date_given, next_due_date, dosage, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [animal_id, vaccine_name, date_given, next_due_date, dosage, notes]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create vaccination" });
    }
});

// updating a vaccine
router.put("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const {
        vaccine_name,
        date_given,
        next_due_date,
        dosage,
        notes
    } = req.body;

    try {
        const result = await pool.query(
            `
            UPDATE vaccinations v
            SET vaccine_name = $1,
                date_given = $2,
                next_due_date = $3,
                dosage = $4,
                notes = $5
            FROM animals a 
            WHERE v.id = $6
                AND v.animal_id = a.id
                AND a.user_id = $7
            RETURNING v.*
            `,
            [
                vaccine_name,
                date_given,
                next_due_date,
                dosage,
                notes,
                id,
                req.user.id
            ]

        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Vaccination not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update vaccination" });
    }
});

// Delete vacciantion
router.delete("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `
            DELETE FROM vaccinations v
            USING animals a
            WHERE v.id = $1
                AND v.animal_id = a.id
                AND a.user_id = $2
            RETURNING v.*
            `,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Vaccination not found" });
        }

        res.json({ message: "Vaccination Deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to Delete vaccination" });
    }
});

module.exports = router;

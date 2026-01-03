const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

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
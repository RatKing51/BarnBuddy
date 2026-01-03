const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get all animals for logged in user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM animals WHERE user_id = $1 ORDER BY id ASC",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch animals" });
    }
});

// Get all a single animal by ID
router.get("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM animals WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Animal not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch animal" });
    }
})

// Create a new animal
router.post("/", authMiddleware, async (req, res) => {
    const { herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO animals
            (user_id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            RETURNING *`,
            [req.user.id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create animal" });
    }
})

// Update an exsisting animal
router.put("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id } = req.body;

    try {
        const result = await pool.query(
            `UPDATE animals set herd_id=$1, name=$2, species=$3, sex=$4, birthdate=$5, age=$6, comments=$7, weight=$10, behavior=$11, tag_id=$12
             WHERE id=$8 AND user_id=$9
             RETURNING *`,
             [herd_id, name, species, sex, birthdate, age, comments, id, req.user.id, weight, behavior, tag_id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Animal not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update animal" });
    }
});

// Delete animal
router.delete("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM animals WHERE id=$1 AND user_id=$2 RETURNING *",
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Animal not found" });
        res.json({ message: "Animnal deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete animal" });
    }
});

router.get("/herd/:herdId", authMiddleware, async (req, res) => {
    const { herdId } = req.params;

    try {
        const result = await pool.query(
            `SELECT *
            FROM animals
            WHERE herd_id = $1
              AND user_id = $2
            ORDER BY name ASC`,
            [herdId, req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({error:"Failed to get animals for herd"})
    }
})

module.exports = router;
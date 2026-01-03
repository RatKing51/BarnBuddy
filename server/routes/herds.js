const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get all herds for a user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM herds WHERE user_id = $1",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch herds" });
    }
});

// Get single herd by id
router.get("/:id", authMiddleware, async (req, res) => {
    const herdId = req.params.id;
    try {
        const result = await pool.query(
            "SELECT * FROM herds WHERE id = $1 AND user_id = $2",
            [herdId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Herd not found" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch herd" });
    }
});

// create a new herd
router.post("/", authMiddleware, async (req, res) => {
    const { name, description, location } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO herds (user_id, name, description, location) VALUES ($1, $2, $3, $4) RETURNING *",
            [req.user.id, name, description || "", location || ""]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create herd" });
    }
})

// Update herd
router.put("/:id", authMiddleware, async (req, res) => {
    const herdId = req.params.id;
    const { name, description, location } = req.body;

    try {
        const result = await pool.query(
            "UPDATE herds SET name=$1, description=$2, location=$3 WHERE id=$4 AND user_id=$5 RETURNING *",
            [name, description, location, herdId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Herd not found or not authorized" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update herd"})
    }
})

// Delete a herd
router.delete("/:id", authMiddleware, async (req, res) => {
    const herdId = req.params.id;
    try {
        const result = await pool.query(
            "DELETE FROM herds WHERE id=$1 AND user_id=$2 RETURNING *",
            [herdId, req.user.id]
        );

        if (result.rows.length === 0){
            return res.status(404).json({ error: "Herd not found or not authoprized" });
        }

        res.json({ message: "Herd deleted successfully", herd: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete herd" });
    }
})

module.exports = router;
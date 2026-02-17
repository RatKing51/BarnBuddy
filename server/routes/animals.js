const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get unassigned animals
router.get("/unassigned", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM animals WHERE herd_id IS NULL AND user_id=$1`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get animals that are unassigned" });
    }
});

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

// Get a single animal by ID
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
});

// Create a new animal
router.post("/", authMiddleware, async (req, res) => {
    let { herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url } = req.body;

    // Handle "unassigned" herd
    herd_id = herd_id === "unassigned" ? null : herd_id;

    try {
        const result = await pool.query(
            `INSERT INTO animals
            (user_id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
            RETURNING *`,
            [req.user.id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create animal" });
    }
});

// Update an existing animal
router.put("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    let { herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url } = req.body;

    // Handle "unassigned" herd
    herd_id = herd_id === "unassigned" ? null : herd_id;

    try {
        const result = await pool.query(
            `UPDATE animals SET herd_id=$1, name=$2, species=$3, sex=$4, birthdate=$5, age=$6, comments=$7, weight=$8, behavior=$9, tag_id=$10, image_url = $13
             WHERE id=$11 AND user_id=$12
             RETURNING *`,
            [herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, id, req.user.id, image_url]
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
        res.json({ message: "Animal deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete animal" });
    }
});

// Get animals by herd
router.get("/herd/:herdId", authMiddleware, async (req, res) => {
    const { herdId } = req.params;

    try {
        let result;
        if (herdId === "unassigned") {
            result = await pool.query(
                `SELECT * FROM animals WHERE herd_id IS NULL AND user_id=$1 ORDER BY name ASC`,
                [req.user.id]
            );
        } else {
            result = await pool.query(
                `SELECT * FROM animals WHERE herd_id=$1 AND user_id=$2 ORDER BY name ASC`,
                [herdId, req.user.id]
            );
        }

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get animals for herd" });
    }
});

const upload = require("../middleware/upload");

router.post(
  "/:id/upload",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      const animalId = req.params.id;
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }
      const imagePath = `/uploads/animals/${req.file.filename}`;

      const updateResult = await pool.query(
        "UPDATE animals SET image_url = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
        [imagePath, animalId, req.user.id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: "Animal not found" });
      }

      res.json({ message: "Image uploaded", image_url: imagePath });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);


router.delete("/:id/upload", authMiddleware, async (req, res) => {
  try {
    const animalId = req.params.id;

    const animalResult = await pool.query(
      "SELECT image_url FROM animals WHERE id = $1 AND user_id = $2",
      [animalId, req.user.id]
    );

    if (animalResult.rows.length === 0) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const currentImageUrl = animalResult.rows[0].image_url;

    await pool.query(
      "UPDATE animals SET image_url = NULL WHERE id = $1 AND user_id = $2",
      [animalId, req.user.id]
    );

    if (currentImageUrl) {
      const relativePath = currentImageUrl.replace(/^\/+/, "");
      const absolutePath = path.resolve(relativePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    res.json({ message: "Image removed", image_url: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove image" });
  }
});


module.exports = router;

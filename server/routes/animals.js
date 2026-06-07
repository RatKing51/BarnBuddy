const express = require("express");
const multer = require("multer");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const normalizeAnimalStatus = (status) => {
    if (status === "deceased") return "deceased";
    return "active";
};

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

// Multer storage configuration - store in memory as buffer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images allowed"), false);
    }
  }
});

// Upload image and store in database
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

      // Check if animal exists
      const animalCheck = await pool.query(
        "SELECT id FROM animals WHERE id = $1 AND user_id = $2",
        [animalId, req.user.id]
      );

      if (animalCheck.rows.length === 0) {
        return res.status(404).json({ error: "Animal not found" });
      }

      // Store image buffer in database
      const updateResult = await pool.query(
        "UPDATE animals SET image_data = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
        [req.file.buffer, animalId, req.user.id]
      );

      res.json({ message: "Image uploaded successfully", animal_id: animalId });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// Get image from database
router.get(
  "/:id/image",
  authMiddleware,
  async (req, res) => {
    try {
      const animalId = req.params.id;

      const result = await pool.query(
        "SELECT image_data FROM animals WHERE id = $1 AND user_id = $2",
        [animalId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Animal not found" });
      }

      const imageData = result.rows[0].image_data;
      if (!imageData) {
        return res.status(404).json({ error: "No image found for this animal" });
      }

      res.set("Content-Type", "image/jpeg");
      res.send(imageData);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to retrieve image" });
    }
  }
);

// Delete image
router.delete(
  "/:id/upload",
  authMiddleware,
  async (req, res) => {
    try {
      const animalId = req.params.id;

      const animalResult = await pool.query(
        "SELECT id FROM animals WHERE id = $1 AND user_id = $2",
        [animalId, req.user.id]
      );

      if (animalResult.rows.length === 0) {
        return res.status(404).json({ error: "Animal not found" });
      }

      // Clear image data from database
      await pool.query(
        "UPDATE animals SET image_data = NULL WHERE id = $1 AND user_id = $2",
        [animalId, req.user.id]
      );

      res.json({ message: "Image removed successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to remove image" });
    }
  }
);

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
    let {
        herd_id,
        name,
        species,
        sex,
        birthdate,
        age,
        comments,
        weight,
        behavior,
        tag_id,
        image_url,
        status,
        deceased_date,
        deceased_notes,
    } = req.body;

    // Handle "unassigned" herd
    herd_id = herd_id === "unassigned" ? null : herd_id;
    status = normalizeAnimalStatus(status);
    if (status !== "deceased") {
        deceased_date = null;
        deceased_notes = null;
    }

    try {
        const result = await pool.query(
            `INSERT INTO animals
            (user_id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url, birth_weight, birth_notes, status, deceased_date, deceased_notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, NULL, $13, $14, $15) 
            RETURNING *`,
            [req.user.id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url, status, deceased_date || null, deceased_notes || null]
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
    let {
        herd_id,
        name,
        species,
        sex,
        birthdate,
        age,
        comments,
        weight,
        behavior,
        tag_id,
        image_url,
        status,
        deceased_date,
        deceased_notes,
    } = req.body;

    // Handle "unassigned" herd
    herd_id = herd_id === "unassigned" ? null : herd_id;
    status = normalizeAnimalStatus(status);
    if (status !== "deceased") {
        deceased_date = null;
        deceased_notes = null;
    }

    try {
        const result = await pool.query(
            `UPDATE animals
             SET herd_id=$1,
                 name=$2,
                 species=$3,
                 sex=$4,
                 birthdate=$5,
                 age=$6,
                 comments=$7,
                 weight=$8,
                 behavior=$9,
                 tag_id=$10,
                 image_url=$13,
                 status=$14,
                 deceased_date=$15,
                 deceased_notes=$16
             WHERE id=$11 AND user_id=$12
             RETURNING *`,
            [herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, id, req.user.id, image_url, status, deceased_date || null, deceased_notes || null]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Animal not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update animal" });
    }
});

// Update birth data for an animal (separate endpoint)
router.put("/:id/birth-data", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { birth_weight, birth_notes } = req.body;

    try {
        const result = await pool.query(
            `UPDATE animals SET birth_weight=$1, birth_notes=$2
             WHERE id=$3 AND user_id=$4
             RETURNING *`,
            [birth_weight, birth_notes, id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Animal not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update birth data" });
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

module.exports = router;

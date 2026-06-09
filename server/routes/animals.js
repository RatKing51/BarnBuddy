const express = require("express");
const multer = require("multer");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const normalizeAnimalStatus = (status) => {
    if (status === "deceased") return "deceased";
    return "active";
};

async function getHerdCareSummaryData(userId, herdId, careWindowDays = 7) {
    const animalFilter =
        herdId === "unassigned"
            ? "a.herd_id IS NULL AND a.user_id = $1"
            : "a.herd_id = $2 AND a.user_id = $1";
    const params = herdId === "unassigned" ? [userId] : [userId, herdId];

    const animalResult = await pool.query(
        `SELECT a.id, a.status, a.deceased_date
         FROM animals a
         WHERE ${animalFilter}`,
        params
    );
    const animalIds = animalResult.rows.map((animal) => animal.id);

    if (animalIds.length === 0) {
        return {
            vaccinationsDue: 0,
            vaccinationsDueSoon: 0,
            upcomingVetVisits: 0,
            animalUrgencies: {},
        };
    }

    const vaccinationResult = await pool.query(
        `SELECT v.animal_id, v.next_due_date
         FROM vaccinations v
         JOIN animals a ON v.animal_id = a.id
         WHERE a.user_id = $1
           AND v.animal_id = ANY($2::int[])
           AND v.next_due_date IS NOT NULL`,
        [userId, animalIds]
    );

    const vetVisitResult = await pool.query(
        `SELECT vv.animal_id,
                vv.visit_date,
                vv.follow_up_date,
                COALESCE(vv.completed, false) AS completed,
                COALESCE(vv.visit_completed, false) AS visit_completed,
                COALESCE(vv.follow_up_completed, false) AS follow_up_completed
         FROM vet_visits vv
         JOIN animals a ON vv.animal_id = a.id
         WHERE a.user_id = $1
           AND vv.animal_id = ANY($2::int[])`,
        [userId, animalIds]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soonThreshold = new Date(today.getTime() + careWindowDays * 24 * 60 * 60 * 1000);
    const vetUpcomingThreshold = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const animalStates = new Map(
        animalResult.rows.map((animal) => [
            animal.id,
            {
                hasOverdue: false,
                hasSoon: false,
                urgency: animal.status === "deceased" ? "deceased" : "green",
            },
        ])
    );
    let vaccinationsDue = 0;
    let vaccinationsDueSoon = 0;
    let upcomingVetVisits = 0;

    const parseDate = (value) => {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    };

    vaccinationResult.rows.forEach((vaccination) => {
        const state = animalStates.get(vaccination.animal_id);
        if (!state || state.urgency === "deceased") return;

        const dueDate = parseDate(vaccination.next_due_date);
        if (!dueDate) return;

        if (dueDate < today) {
            state.hasOverdue = true;
            vaccinationsDue += 1;
        } else if (dueDate <= soonThreshold) {
            state.hasSoon = true;
            vaccinationsDue += 1;
            vaccinationsDueSoon += 1;
        }
    });

    vetVisitResult.rows.forEach((visit) => {
        const state = animalStates.get(visit.animal_id);
        if (!state || state.urgency === "deceased") return;

        const visitDate = parseDate(visit.visit_date);
        const followUpDate = parseDate(visit.follow_up_date);
        const visitDone = visit.completed || visit.visit_completed;
        const followUpDone = visit.completed || visit.follow_up_completed;

        if (visitDate && visitDate < today && !visitDone) {
            state.hasOverdue = true;
        }

        if (followUpDate && followUpDate < today && !followUpDone) {
            state.hasOverdue = true;
        }

        if (!visitDone && visitDate && visitDate >= today && visitDate <= vetUpcomingThreshold) {
            upcomingVetVisits += 1;
            if (visitDate <= soonThreshold) state.hasSoon = true;
        }

        if (!followUpDone && followUpDate && followUpDate >= today && followUpDate <= vetUpcomingThreshold) {
            upcomingVetVisits += 1;
            if (followUpDate <= soonThreshold) state.hasSoon = true;
        }
    });

    const animalUrgencies = {};
    animalStates.forEach((state, animalId) => {
        animalUrgencies[animalId] =
            state.urgency === "deceased" ? "deceased" : state.hasOverdue ? "red" : state.hasSoon ? "yellow" : "green";
    });

    return {
        vaccinationsDue,
        vaccinationsDueSoon,
        upcomingVetVisits,
        animalUrgencies,
    };
}

function normalizeCareWindowDays(value) {
    return Math.max(1, Math.min(Number.parseInt(value, 10) || 7, 90));
}

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

router.get("/dashboard/bootstrap", authMiddleware, async (req, res) => {
    const careWindowDays = normalizeCareWindowDays(req.query.careWindowDays);

    try {
        const [herdsResult, unassignedCountResult] = await Promise.all([
            pool.query("SELECT * FROM herds WHERE user_id = $1 ORDER BY name ASC", [req.user.id]),
            pool.query("SELECT COUNT(*)::int AS count FROM animals WHERE herd_id IS NULL AND user_id = $1", [req.user.id]),
        ]);
        const herds = herdsResult.rows;
        const hasUnassignedAnimals = Number(unassignedCountResult.rows[0]?.count) > 0;
        const selectedHerd = herds[0] || (hasUnassignedAnimals ? { id: "unassigned", name: "Unassigned" } : null);

        if (!selectedHerd) {
            return res.json({
                herds,
                hasUnassignedAnimals,
                selectedHerd: null,
                animals: [],
                careSummary: {
                    vaccinationsDue: 0,
                    vaccinationsDueSoon: 0,
                    upcomingVetVisits: 0,
                    animalUrgencies: {},
                },
            });
        }

        const animalsResult = selectedHerd.id === "unassigned"
            ? await pool.query("SELECT * FROM animals WHERE herd_id IS NULL AND user_id = $1 ORDER BY name ASC", [req.user.id])
            : await pool.query("SELECT * FROM animals WHERE herd_id = $1 AND user_id = $2 ORDER BY name ASC", [selectedHerd.id, req.user.id]);
        const careSummary = await getHerdCareSummaryData(req.user.id, selectedHerd.id, careWindowDays);

        res.json({
            herds,
            hasUnassignedAnimals,
            selectedHerd,
            animals: animalsResult.rows,
            careSummary,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load dashboard data" });
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

router.get("/herd/:herdId/care-summary", authMiddleware, async (req, res) => {
    const { herdId } = req.params;
    const careWindowDays = normalizeCareWindowDays(req.query.careWindowDays);

    try {
        res.json(await getHerdCareSummaryData(req.user.id, herdId, careWindowDays));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to get herd care summary" });
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
        dam_id,
        sire_id,
        birth_weight,
        birth_notes,
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
            (user_id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url, birth_weight, birth_notes, status, deceased_date, deceased_notes, dam_id, sire_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
            RETURNING *`,
            [req.user.id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url, birth_weight || null, birth_notes || null, status, deceased_date || null, deceased_notes || null, dam_id || null, sire_id || null]
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
        dam_id,
        sire_id,
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
                 deceased_notes=$16,
                 dam_id=$17,
                 sire_id=$18
             WHERE id=$11 AND user_id=$12
             RETURNING *`,
            [herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, id, req.user.id, image_url, status, deceased_date || null, deceased_notes || null, dam_id || null, sire_id || null]
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
        const linkedBirths = await pool.query(
            "SELECT reproduction_id FROM births WHERE offspring_id=$1 AND user_id=$2",
            [id, req.user.id]
        );

        await pool.query(
            "DELETE FROM births WHERE offspring_id=$1 AND user_id=$2",
            [id, req.user.id]
        );

        const result = await pool.query(
            "DELETE FROM animals WHERE id=$1 AND user_id=$2 RETURNING *",
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Animal not found" });
        await Promise.all(
            linkedBirths.rows
                .filter((birth) => birth.reproduction_id)
                .map((birth) => pool.query(
                    `UPDATE reproductions
                     SET offspring_count = GREATEST(COALESCE(offspring_count, 0) - 1, 0),
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id=$1 AND user_id=$2`,
                    [birth.reproduction_id, req.user.id]
                ))
        );
        res.json({ message: "Animal deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete animal" });
    }
});

module.exports = router;

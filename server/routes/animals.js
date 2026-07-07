const express = require("express");
const multer = require("multer");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createAnimalImageKey,
  deleteObject,
  getSignedDownloadUrl,
  isR2Configured,
  uploadObject,
} = require("../services/r2Storage");

const router = express.Router();

const animalResponseColumns = `
  id, user_id, herd_id, name, species, sex, birthdate, age, comments,
  weight, behavior, tag_id, image_url, birth_weight, birth_notes,
  tracking_years, dam_id, sire_id, status, deceased_date, deceased_notes,
  created_at, image_mime_type,
  (image_key IS NOT NULL OR image_data IS NOT NULL) AS has_image
`;

const normalizeAnimalStatus = (status) => {
    if (status === "archived") return "archived";
    if (status === "deceased") return "deceased";
    return "active";
};

const isInactiveAnimalStatus = (status) => ["archived", "deceased"].includes(status);

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
                urgency: isInactiveAnimalStatus(animal.status) ? animal.status : "green",
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
        if (!state || state.urgency !== "green") return;

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
        if (!state || state.urgency !== "green") return;

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
            state.urgency !== "green" ? state.urgency : state.hasOverdue ? "red" : state.hasSoon ? "yellow" : "green";
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

function normalizeWeightUnit(unit) {
    const allowedUnits = ["lb", "kg"];
    return allowedUnits.includes(unit) ? unit : "lb";
}

function normalizeWeightValue(value) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    return number.toFixed(2);
}

function normalizeNullableInteger(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : null;
}

function normalizeNullableDecimal(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeNullableDate(value) {
    return value === null || value === undefined || value === "" ? null : value;
}

async function ensureAnimalOwner(animalId, userId) {
    const result = await pool.query(
        "SELECT id FROM animals WHERE id = $1 AND user_id = $2",
        [animalId, userId]
    );

    return result.rows[0] || null;
}

async function syncAnimalCurrentWeight(animalId, userId) {
    const latest = await pool.query(
        `SELECT weight
         FROM weight_records
         WHERE animal_id = $1 AND user_id = $2
         ORDER BY recorded_date DESC, created_at DESC, id DESC
         LIMIT 1`,
        [animalId, userId]
    );

    const latestWeight = latest.rows[0]?.weight || null;
    const result = await pool.query(
        `UPDATE animals
         SET weight = $1
         WHERE id = $2 AND user_id = $3
         RETURNING ${animalResponseColumns}`,
        [latestWeight, animalId, userId]
    );

    return result.rows[0] || null;
}

// Get unassigned animals
router.get("/unassigned", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ${animalResponseColumns} FROM animals WHERE herd_id IS NULL AND user_id=$1`,
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
            ? await pool.query(`SELECT ${animalResponseColumns} FROM animals WHERE herd_id IS NULL AND user_id = $1 ORDER BY name ASC`, [req.user.id])
            : await pool.query(`SELECT ${animalResponseColumns} FROM animals WHERE herd_id = $1 AND user_id = $2 ORDER BY name ASC`, [selectedHerd.id, req.user.id]);
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
                `SELECT ${animalResponseColumns} FROM animals WHERE herd_id IS NULL AND user_id=$1 ORDER BY name ASC`,
                [req.user.id]
            );
        } else {
            result = await pool.query(
                `SELECT ${animalResponseColumns} FROM animals WHERE herd_id=$1 AND user_id=$2 ORDER BY name ASC`,
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

router.get("/:id/weight-records", authMiddleware, async (req, res) => {
    try {
        const animal = await ensureAnimalOwner(req.params.id, req.user.id);
        if (!animal) return res.status(404).json({ error: "Animal not found" });

        const result = await pool.query(
            `SELECT *
             FROM weight_records
             WHERE animal_id = $1 AND user_id = $2
             ORDER BY recorded_date ASC, created_at ASC, id ASC`,
            [req.params.id, req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch weight records" });
    }
});

router.post("/:id/weight-records", authMiddleware, async (req, res) => {
    const weight = normalizeWeightValue(req.body.weight);
    const unit = normalizeWeightUnit(req.body.unit);
    const recordedDate = req.body.recorded_date || new Date().toISOString().slice(0, 10);
    const notes = req.body.notes || "";

    if (!weight) return res.status(400).json({ error: "A positive weight is required" });

    try {
        const animal = await ensureAnimalOwner(req.params.id, req.user.id);
        if (!animal) return res.status(404).json({ error: "Animal not found" });

        const result = await pool.query(
            `INSERT INTO weight_records
             (user_id, animal_id, recorded_date, weight, unit, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [req.user.id, req.params.id, recordedDate, weight, unit, notes]
        );
        const updatedAnimal = await syncAnimalCurrentWeight(req.params.id, req.user.id);

        res.status(201).json({ record: result.rows[0], animal: updatedAnimal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create weight record" });
    }
});

router.put("/:id/weight-records/:recordId", authMiddleware, async (req, res) => {
    const weight = normalizeWeightValue(req.body.weight);
    const unit = normalizeWeightUnit(req.body.unit);
    const recordedDate = req.body.recorded_date || new Date().toISOString().slice(0, 10);
    const notes = req.body.notes || "";

    if (!weight) return res.status(400).json({ error: "A positive weight is required" });

    try {
        const result = await pool.query(
            `UPDATE weight_records wr
             SET recorded_date = $1,
                 weight = $2,
                 unit = $3,
                 notes = $4,
                 updated_at = CURRENT_TIMESTAMP
             FROM animals a
             WHERE wr.id = $5
               AND wr.animal_id = a.id
               AND wr.animal_id = $6
               AND wr.user_id = $7
               AND a.user_id = $7
             RETURNING wr.*`,
            [recordedDate, weight, unit, notes, req.params.recordId, req.params.id, req.user.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Weight record not found" });
        }

        const updatedAnimal = await syncAnimalCurrentWeight(req.params.id, req.user.id);
        res.json({ record: result.rows[0], animal: updatedAnimal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update weight record" });
    }
});

router.delete("/:id/weight-records/:recordId", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM weight_records wr
             USING animals a
             WHERE wr.id = $1
               AND wr.animal_id = a.id
               AND wr.animal_id = $2
               AND wr.user_id = $3
               AND a.user_id = $3
             RETURNING wr.id`,
            [req.params.recordId, req.params.id, req.user.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: "Weight record not found" });
        }

        const updatedAnimal = await syncAnimalCurrentWeight(req.params.id, req.user.id);
        res.json({ message: "Weight record deleted", animal: updatedAnimal });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete weight record" });
    }
});

// Get all animals for logged in user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ${animalResponseColumns} FROM animals WHERE user_id = $1 ORDER BY id ASC`,
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
const supportedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) {
    return "image/png";
  }

  const header = buffer.subarray(0, 12).toString("ascii");
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) {
    return "image/gif";
  }
  if (header.startsWith("RIFF") && header.endsWith("WEBP")) {
    return "image/webp";
  }

  const boxType = buffer.subarray(4, 8).toString("ascii");
  const brand = buffer.subarray(8, 12).toString("ascii");
  if (boxType === "ftyp" && ["avif", "avis"].includes(brand)) {
    return "image/avif";
  }

  return null;
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (supportedImageTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported image type"), false);
    }
  }
});

// Upload an image to R2. Database storage remains as a temporary fallback
// for installations that have not configured R2 yet.
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

      const imageMimeType = detectImageMimeType(req.file.buffer);
      if (!imageMimeType || !supportedImageTypes.has(imageMimeType)) {
        return res.status(400).json({
          error: "Unsupported image format. Please use JPG, PNG, GIF, WebP, or AVIF.",
        });
      }

      // Check if animal exists
      const animalCheck = await pool.query(
        "SELECT id, image_key FROM animals WHERE id = $1 AND user_id = $2",
        [animalId, req.user.id]
      );

      if (animalCheck.rows.length === 0) {
        return res.status(404).json({ error: "Animal not found" });
      }

      if (isR2Configured()) {
        const oldImageKey = animalCheck.rows[0].image_key;
        const imageKey = createAnimalImageKey(req.user.id, animalId, imageMimeType);

        await uploadObject({
          key: imageKey,
          body: req.file.buffer,
          contentType: imageMimeType,
        });

        try {
          await pool.query(
            `UPDATE animals
             SET image_key = $1,
                 image_mime_type = $2,
                 image_data = NULL
             WHERE id = $3 AND user_id = $4`,
            [imageKey, imageMimeType, animalId, req.user.id]
          );
        } catch (err) {
          await deleteObject(imageKey).catch(() => {});
          throw err;
        }

        if (oldImageKey && oldImageKey !== imageKey) {
          await deleteObject(oldImageKey).catch((err) => {
            console.error("Failed to delete replaced R2 image:", err);
          });
        }
      } else {
        await pool.query(
          `UPDATE animals
           SET image_data = $1,
               image_mime_type = $2,
               image_key = NULL
           WHERE id = $3 AND user_id = $4`,
          [req.file.buffer, imageMimeType, animalId, req.user.id]
        );
      }

      res.json({ message: "Image uploaded successfully", animal_id: animalId });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

router.get("/:id/image-url", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT image_key FROM animals WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const imageKey = result.rows[0].image_key;
    if (!imageKey) {
      return res.status(404).json({ error: "No R2 image found for this animal" });
    }
    if (!isR2Configured()) {
      return res.status(503).json({ error: "R2 is not configured" });
    }

    res.set("Cache-Control", "private, no-store");
    res.json({
      url: await getSignedDownloadUrl(imageKey),
      expiresIn: require("../config/env").r2.signedUrlTtlSeconds,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create image URL" });
  }
});

// Get image from database
router.get(
  "/:id/image",
  authMiddleware,
  async (req, res) => {
    try {
      const animalId = req.params.id;

      const result = await pool.query(
        "SELECT image_data, image_mime_type, image_key FROM animals WHERE id = $1 AND user_id = $2",
        [animalId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Animal not found" });
      }

      if (result.rows[0].image_key && isR2Configured()) {
        return res.redirect(302, await getSignedDownloadUrl(result.rows[0].image_key));
      }

      const imageData = result.rows[0].image_data;
      if (!imageData) {
        return res.status(404).json({ error: "No image found for this animal" });
      }

      const imageMimeType =
        result.rows[0].image_mime_type || detectImageMimeType(imageData);

      if (!imageMimeType) {
        return res.status(415).json({ error: "Unsupported stored image format" });
      }

      res.set({
        "Content-Type": imageMimeType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      });
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
        "SELECT id, image_key FROM animals WHERE id = $1 AND user_id = $2",
        [animalId, req.user.id]
      );

      if (animalResult.rows.length === 0) {
        return res.status(404).json({ error: "Animal not found" });
      }

      const imageKey = animalResult.rows[0].image_key;
      if (imageKey) {
        await deleteObject(imageKey);
      }

      await pool.query(
        "UPDATE animals SET image_data = NULL, image_mime_type = NULL, image_key = NULL WHERE id = $1 AND user_id = $2",
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
            `SELECT ${animalResponseColumns} FROM animals WHERE id = $1 AND user_id = $2`,
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
    herd_id = herd_id === "unassigned" || herd_id === "" ? null : herd_id;
    age = normalizeNullableInteger(age);
    weight = normalizeNullableDecimal(weight);
    birth_weight = normalizeNullableDecimal(birth_weight);
    birthdate = normalizeNullableDate(birthdate);
    dam_id = normalizeNullableInteger(dam_id);
    sire_id = normalizeNullableInteger(sire_id);
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
            RETURNING ${animalResponseColumns}`,
            [req.user.id, herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, image_url, birth_weight, birth_notes || null, status, deceased_date || null, deceased_notes || null, dam_id, sire_id]
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
    herd_id = herd_id === "unassigned" || herd_id === "" ? null : herd_id;
    age = normalizeNullableInteger(age);
    weight = normalizeNullableDecimal(weight);
    birthdate = normalizeNullableDate(birthdate);
    dam_id = normalizeNullableInteger(dam_id);
    sire_id = normalizeNullableInteger(sire_id);
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
             RETURNING ${animalResponseColumns}`,
            [herd_id, name, species, sex, birthdate, age, comments, weight, behavior, tag_id, id, req.user.id, image_url, status, deceased_date || null, deceased_notes || null, dam_id, sire_id]
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
    const { birth_notes } = req.body;
    const birth_weight = normalizeNullableDecimal(req.body.birth_weight);

    try {
        const result = await pool.query(
            `UPDATE animals SET birth_weight=$1, birth_notes=$2
             WHERE id=$3 AND user_id=$4
             RETURNING ${animalResponseColumns}`,
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
        const animalImageResult = await pool.query(
            "SELECT image_key FROM animals WHERE id=$1 AND user_id=$2",
            [id, req.user.id]
        );

        const linkedBirths = await pool.query(
            "SELECT reproduction_id FROM births WHERE offspring_id=$1 AND user_id=$2",
            [id, req.user.id]
        );

        await pool.query(
            "DELETE FROM births WHERE offspring_id=$1 AND user_id=$2",
            [id, req.user.id]
        );

        const result = await pool.query(
            "DELETE FROM animals WHERE id=$1 AND user_id=$2 RETURNING id",
            [id, req.user.id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Animal not found" });
        const imageKey = animalImageResult.rows[0]?.image_key;
        if (imageKey) {
            await deleteObject(imageKey).catch((err) => {
                console.error("Failed to delete animal image from R2:", err);
            });
        }
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

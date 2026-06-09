const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensurePremiumRecordSchema } = require("../services/ensureAppSchema");

const router = express.Router();

function ensurePremiumSchema() {
  return ensurePremiumRecordSchema();
}

function requirePremium(req, res) {
  if (!req.user.subscription?.isPremium) {
    res.status(403).json({
      error: "Premium is required for premium records.",
      subscription: req.user.subscription || null,
    });
    return false;
  }

  return true;
}

async function userOwnsHerd(userId, herdId) {
  const result = await pool.query(
    "SELECT id FROM herds WHERE id = $1 AND user_id = $2",
    [herdId, userId]
  );

  return result.rowCount > 0;
}

async function userOwnsAnimal(userId, animalId) {
  const result = await pool.query(
    "SELECT id FROM animals WHERE id = $1 AND user_id = $2",
    [animalId, userId]
  );

  return result.rowCount > 0;
}

function getHerdAnimalFilter(herdId, alias = "a") {
  return herdId === "unassigned" ? `${alias}.herd_id IS NULL` : `${alias}.herd_id = $2`;
}

function getHerdParams(userId, herdId) {
  return herdId === "unassigned" ? [userId] : [userId, herdId];
}

router.get("/finance/animal/:animalId", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { animalId } = req.params;
    if (!(await userOwnsAnimal(req.user.id, animalId))) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const result = await pool.query(
      "SELECT * FROM finance_records WHERE user_id = $1 AND animal_id = $2 ORDER BY record_date DESC, id DESC",
      [req.user.id, animalId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch finance records" });
  }
});

router.get("/finance/herd/:herdId/summary", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { herdId } = req.params;
    if (herdId !== "unassigned" && !(await userOwnsHerd(req.user.id, herdId))) {
      return res.status(404).json({ error: "Herd not found" });
    }

    const params = getHerdParams(req.user.id, herdId);
    const animalFilter = getHerdAnimalFilter(herdId);
    const financeHerdFilter =
      herdId === "unassigned"
        ? "f.herd_id IS NULL AND f.animal_id IS NULL"
        : "f.herd_id = $2";

    const [financeResult, feedResult, vetResult] = await Promise.all([
      pool.query(
        `SELECT f.*, a.name AS animal_name, a.tag_id AS animal_tag, a.species AS animal_species
         FROM finance_records f
         LEFT JOIN animals a ON f.animal_id = a.id
         WHERE f.user_id = $1
           AND (
             (${financeHerdFilter})
             OR (f.animal_id IS NOT NULL AND ${animalFilter})
           )
         ORDER BY f.record_date DESC NULLS LAST, f.id DESC`,
        params
      ),
      pool.query(
        `SELECT fr.*
         FROM feed_records fr
         LEFT JOIN animals a ON fr.animal_id = a.id
         WHERE fr.user_id = $1
           AND (
             ${herdId === "unassigned" ? "fr.herd_id IS NULL AND fr.animal_id IS NULL" : "fr.herd_id = $2"}
             OR (fr.animal_id IS NOT NULL AND ${animalFilter})
           )
         ORDER BY fr.record_date DESC NULLS LAST, fr.id DESC`,
        params
      ),
      pool.query(
        `SELECT vv.*, a.name AS animal_name, a.tag_id AS animal_tag, a.species AS animal_species
         FROM vet_visits vv
         JOIN animals a ON vv.animal_id = a.id
         WHERE a.user_id = $1
           AND ${animalFilter}
         ORDER BY vv.visit_date DESC NULLS LAST, vv.id DESC`,
        params
      ),
    ]);

    res.json({
      financeRecords: financeResult.rows,
      feedRecords: feedResult.rows,
      vetVisits: vetResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch herd finance summary" });
  }
});

router.post("/finance", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { animal_id, herd_id, record_date, category, amount, vendor, notes } = req.body;
    const normalizedAnimalId = animal_id || null;
    const normalizedHerdId = herd_id || null;

    if (normalizedAnimalId && !(await userOwnsAnimal(req.user.id, normalizedAnimalId))) {
      return res.status(404).json({ error: "Animal not found" });
    }

    if (normalizedHerdId && !(await userOwnsHerd(req.user.id, normalizedHerdId))) {
      return res.status(404).json({ error: "Herd not found" });
    }

    if (!normalizedAnimalId && !Object.prototype.hasOwnProperty.call(req.body, "herd_id")) {
      return res.status(400).json({ error: "Animal or herd is required" });
    }

    const result = await pool.query(
      `INSERT INTO finance_records (user_id, animal_id, herd_id, record_date, category, amount, vendor, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, normalizedAnimalId, normalizedHerdId, record_date || null, category || "Expense", amount || 0, vendor || "", notes || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create finance record" });
  }
});

router.put("/finance/:id", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { id } = req.params;
    const { animal_id, herd_id, record_date, category, amount, vendor, notes } = req.body;
    const shouldUpdateAnimal = Object.prototype.hasOwnProperty.call(req.body, "animal_id");
    const shouldUpdateHerd = Object.prototype.hasOwnProperty.call(req.body, "herd_id");
    const normalizedAnimalId = animal_id || null;
    const normalizedHerdId = herd_id || null;

    if (normalizedAnimalId && !(await userOwnsAnimal(req.user.id, normalizedAnimalId))) {
      return res.status(404).json({ error: "Animal not found" });
    }

    if (normalizedHerdId && !(await userOwnsHerd(req.user.id, normalizedHerdId))) {
      return res.status(404).json({ error: "Herd not found" });
    }

    const result = await pool.query(
      `UPDATE finance_records
       SET animal_id = CASE WHEN $1 THEN $2 ELSE animal_id END,
           herd_id = CASE WHEN $3 THEN $4 ELSE herd_id END,
           record_date = $5,
           category = $6,
           amount = $7,
           vendor = $8,
           notes = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [shouldUpdateAnimal, normalizedAnimalId, shouldUpdateHerd, normalizedHerdId, record_date || null, category || "Expense", amount || 0, vendor || "", notes || "", id, req.user.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Finance record not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update finance record" });
  }
});

router.delete("/finance/:id", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const result = await pool.query(
      "DELETE FROM finance_records WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Finance record not found" });
    res.json({ message: "Finance record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete finance record" });
  }
});

router.get("/feed/animal/:animalId", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { animalId } = req.params;
    if (!(await userOwnsAnimal(req.user.id, animalId))) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const result = await pool.query(
      "SELECT * FROM feed_records WHERE user_id = $1 AND animal_id = $2 ORDER BY record_date DESC, id DESC",
      [req.user.id, animalId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch feed records" });
  }
});

router.get("/feed/herd/:herdId", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { herdId } = req.params;
    if (!(await userOwnsHerd(req.user.id, herdId))) {
      return res.status(404).json({ error: "Herd not found" });
    }

    const result = await pool.query(
      "SELECT * FROM feed_records WHERE user_id = $1 AND herd_id = $2 ORDER BY record_date DESC, id DESC",
      [req.user.id, herdId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch herd feed records" });
  }
});

router.get("/feed/unassigned", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const result = await pool.query(
      "SELECT * FROM feed_records WHERE user_id = $1 AND herd_id IS NULL AND animal_id IS NULL ORDER BY record_date DESC, id DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch unassigned feed records" });
  }
});

router.post("/feed", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { animal_id, herd_id, record_date, feed_type, amount, unit, cost, next_purchase_date, notes } = req.body;
    const normalizedAnimalId = animal_id || null;
    const normalizedHerdId = herd_id || null;

    if (normalizedAnimalId && !(await userOwnsAnimal(req.user.id, normalizedAnimalId))) {
      return res.status(404).json({ error: "Animal not found" });
    }

    if (normalizedHerdId && !(await userOwnsHerd(req.user.id, normalizedHerdId))) {
      return res.status(404).json({ error: "Herd not found" });
    }

    const result = await pool.query(
      `INSERT INTO feed_records (user_id, animal_id, herd_id, record_date, feed_type, amount, unit, cost, next_purchase_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.id, normalizedAnimalId, normalizedHerdId, record_date || null, feed_type || "", amount || 0, unit || "lb", cost || 0, next_purchase_date || null, notes || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create feed record" });
  }
});

router.put("/feed/:id", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const { id } = req.params;
    const { herd_id, record_date, feed_type, amount, unit, cost, next_purchase_date, notes } = req.body;

    if (herd_id && !(await userOwnsHerd(req.user.id, herd_id))) {
      return res.status(404).json({ error: "Herd not found" });
    }

    const result = await pool.query(
      `UPDATE feed_records
       SET herd_id = $1, record_date = $2, feed_type = $3, amount = $4, unit = $5, cost = $6, next_purchase_date = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [herd_id || null, record_date || null, feed_type || "", amount || 0, unit || "lb", cost || 0, next_purchase_date || null, notes || "", id, req.user.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Feed record not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update feed record" });
  }
});

router.delete("/feed/:id", authMiddleware, async (req, res) => {
  if (!requirePremium(req, res)) return;

  try {
    await ensurePremiumSchema();
    const result = await pool.query(
      "DELETE FROM feed_records WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Feed record not found" });
    res.json({ message: "Feed record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete feed record" });
  }
});

module.exports = router;

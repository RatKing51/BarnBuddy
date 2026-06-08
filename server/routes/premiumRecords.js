const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensurePremiumRecordSchema } = require("../services/ensureAppSchema");

const router = express.Router();

function ensurePremiumSchema() {
  return ensurePremiumRecordSchema();
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

router.get("/finance/animal/:animalId", authMiddleware, async (req, res) => {
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

router.post("/finance", authMiddleware, async (req, res) => {
  try {
    await ensurePremiumSchema();
    const { animal_id, record_date, category, amount, vendor, notes } = req.body;
    if (!(await userOwnsAnimal(req.user.id, animal_id))) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const result = await pool.query(
      `INSERT INTO finance_records (user_id, animal_id, record_date, category, amount, vendor, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, animal_id, record_date || null, category || "Expense", amount || 0, vendor || "", notes || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create finance record" });
  }
});

router.put("/finance/:id", authMiddleware, async (req, res) => {
  try {
    await ensurePremiumSchema();
    const { id } = req.params;
    const { record_date, category, amount, vendor, notes } = req.body;
    const result = await pool.query(
      `UPDATE finance_records
       SET record_date = $1, category = $2, amount = $3, vendor = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [record_date || null, category || "Expense", amount || 0, vendor || "", notes || "", id, req.user.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Finance record not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update finance record" });
  }
});

router.delete("/finance/:id", authMiddleware, async (req, res) => {
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

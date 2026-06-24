const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensurePremiumRecordSchema } = require("../services/ensureAppSchema");

const router = express.Router();

function normalizeAnimalIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
        value
            .map((id) => Number.parseInt(id, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];
}

function normalizeInventoryUsage(body) {
    const inventoryItemId = Number.parseInt(body.inventory_item_id, 10);
    const quantityUsed = Number.parseFloat(body.inventory_quantity_used);
    if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
        return { inventoryItemId: null, quantityUsed: 0 };
    }
    return {
        inventoryItemId,
        quantityUsed: Number.isFinite(quantityUsed) && quantityUsed > 0 ? quantityUsed : 0,
    };
}

async function consumeHealthInventory(client, userId, body, animalIds) {
    const { inventoryItemId, quantityUsed } = normalizeInventoryUsage(body);
    if (!inventoryItemId) return { inventoryItemId: null, quantityUsed: 0 };
    if (!quantityUsed) {
        const error = new Error("Inventory amount used must be greater than zero");
        error.status = 400;
        throw error;
    }

    const ids = Array.isArray(animalIds) ? animalIds : [animalIds];
    const totalUsed = quantityUsed * ids.length;
    const result = await client.query(
        `SELECT id, herd_id, item_name, quantity, unit, use_for_health_events
         FROM inventory_records
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [inventoryItemId, userId]
    );
    const item = result.rows[0];
    if (!item || !item.use_for_health_events) {
        const error = new Error("Selected inventory item is not available for health treatments");
        error.status = 400;
        throw error;
    }
    const herdMatch = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM animals
         WHERE user_id = $1
           AND id = ANY($2::int[])
           AND herd_id IS NOT DISTINCT FROM $3`,
        [userId, ids, item.herd_id]
    );
    if (Number(herdMatch.rows[0]?.count) !== ids.length) {
        const error = new Error("Inventory item must belong to the same herd as the selected animals");
        error.status = 400;
        throw error;
    }
    if (Number(item.quantity) < totalUsed) {
        const error = new Error(`Not enough ${item.item_name} in inventory. ${item.quantity} ${item.unit} available.`);
        error.status = 400;
        throw error;
    }

    await client.query(
        `UPDATE inventory_records
         SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3`,
        [totalUsed, inventoryItemId, userId]
    );
    return { inventoryItemId, quantityUsed };
}

// Create the same health event for multiple owned animals.
router.post("/bulk", authMiddleware, async (req, res) => {
    const animalIds = normalizeAnimalIds(req.body.animal_ids);
    const {
        event_date,
        type,
        description,
        severity,
        resolved,
        notes
    } = req.body;

    if (!animalIds.length) {
        return res.status(400).json({ error: "Select at least one animal" });
    }
    if (animalIds.length > 500) {
        return res.status(400).json({ error: "Bulk entries are limited to 500 animals" });
    }
    if (!event_date) {
        return res.status(400).json({ error: "Event date is required" });
    }
    if (!String(type || "").trim()) {
        return res.status(400).json({ error: "Event type is required" });
    }

    await ensurePremiumRecordSchema();
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

        const usage = await consumeHealthInventory(client, req.user.id, req.body, animalIds);
        const result = await client.query(
            `INSERT INTO health_events
             (animal_id, event_date, type, description, severity, resolved, notes, inventory_item_id, inventory_quantity_used)
             SELECT animal_id, $2, $3, $4, $5, $6, $7, $8, $9
             FROM unnest($1::int[]) AS selected(animal_id)
             RETURNING *`,
            [
                animalIds,
                event_date,
                String(type).trim(),
                description || "",
                severity || "Low",
                resolved ?? false,
                notes || "",
                usage.inventoryItemId,
                usage.quantityUsed,
            ]
        );

        await client.query("COMMIT");
        res.status(201).json({ count: result.rowCount, records: result.rows });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(err.status || 500).json({ error: err.status ? err.message : "Failed to create bulk health events" });
    } finally {
        client.release();
    }
});

// create health event
router.post("/", authMiddleware, async (req, res) => {
    const {
        animal_id,
        event_date,
        type,
        description,
        severity,
        resolved,
        notes
    } = req.body;

    await ensurePremiumRecordSchema();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        // ownership check
        const animalCheck = await client.query(
            "SELECT id FROM animals WHERE id=$1 AND user_id=$2",
            [animal_id, req.user.id]
        );

        if (!animalCheck.rowCount) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Unauthorized animal access" });
        }

        const usage = await consumeHealthInventory(client, req.user.id, req.body, Number.parseInt(animal_id, 10));
        const result = await client.query(
            `INSERT INTO health_events
            (animal_id, event_date, type, description, severity, resolved, notes, inventory_item_id, inventory_quantity_used)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [
                animal_id,
                event_date,
                type,
                description,
                severity,
                resolved ?? false,
                notes,
                usage.inventoryItemId,
                usage.quantityUsed,
            ]
        );

        await client.query("COMMIT");
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(err.status || 500).json({ error: err.status ? err.message : "Failed to create health event" });
    } finally {
        client.release();
    }
});

// Get all for one animal
router.get("/animal/:animalId", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT he.*
            FROM health_events he
            JOIN animals a ON he.animal_id = a.id
            WHERE a.id=$1 AND a.user_id=$2
            ORDER BY event_date DESC`,
            [req.params.animalId, req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch health events" });
    }
});

// Get for a single event
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT he.*
            FROM health_events he
            JOIN animals a ON he.animal_id = a.id
            WHERE he.id=$1 AND a.user_id=$2`,
            [req.params.id, req.user.id]
        )

        if (!result.rows.length) {
            return res.status(404).json({ error: "Health event not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch health event" });
    }
});

// Update health event
router.put("/:id", authMiddleware, async (req, res) => {
    const {
        event_date,
        type,
        description,
        severity,
        resolved,
        notes
    } = req.body;

    try {
         const result = await pool.query(
            `UPDATE health_events he
            SET event_date=$1,
                type=$2,
                description=$3,
                severity=$4,
                resolved=$5,
                notes=$6
            FROM animals a 
            WHERE he.id=$7
              AND he.animal_id = a.id
              AND a.user_id=$8
            RETURNING he.*`,
            [
                event_date,
                type,
                description,
                severity,
                resolved,
                notes,
                req.params.id,
                req.user.id
            ]
         );

         if (!result.rows.length) {
            return res.status(404).json({ error: "Health event not found or unauthorized" });
         }
         
         res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update health event" });
    }
});

// delete health event
router.delete("/:id" , authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM health_events he
            USING animals a
            WHERE he.animal_id = a.id
              AND he.id=$1
              AND a.user_id=$2
            RETURNING he.id`,
            [req.params.id, req.user.id]
        );
        
        if (!result.rows.length) {
            return res.status(404).json({ error: "Health event not found or not authorized" });
        }

        res.json({ message: "Health event deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete health event"});
    }
});

module.exports = router;

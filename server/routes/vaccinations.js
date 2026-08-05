const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensurePremiumRecordSchema } = require("../services/ensureAppSchema");
const { normalizeVaccinationPayload } = require("../utils/recordPayloads");
const { isBlank, normalizeNumber, normalizePositiveId } = require("../utils/requestValues");
const { sendRouteError } = require("../utils/routeErrors");

const router = express.Router();

function normalizeAnimalIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(
        value
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];
}

function normalizeInventoryUsage(body) {
    if (isBlank(body.inventory_item_id)) {
        return { inventoryItemId: null, quantityUsed: 0 };
    }

    const inventoryItemId = normalizePositiveId(body.inventory_item_id, { label: "Inventory item" });
    if (inventoryItemId.error) return { error: inventoryItemId.error };
    const quantityUsed = normalizeNumber(body.inventory_quantity_used, {
        label: "Inventory amount used",
        required: true,
        min: 0,
        exclusiveMin: true,
    });
    if (quantityUsed.error) return { error: quantityUsed.error };

    return {
        inventoryItemId: inventoryItemId.value,
        quantityUsed: quantityUsed.value,
    };
}

async function consumeVaccinationInventory(client, userId, body, animalIds) {
    const usage = normalizeInventoryUsage(body);
    if (usage.error) {
        const error = new Error(usage.error);
        error.status = 400;
        throw error;
    }
    const { inventoryItemId, quantityUsed } = usage;
    if (!inventoryItemId) return { inventoryItemId: null, quantityUsed: 0 };

    const ids = Array.isArray(animalIds) ? animalIds : [animalIds];
    const totalUsed = quantityUsed * ids.length;
    const result = await client.query(
        `SELECT id, herd_id, item_name, quantity, unit, use_for_vaccinations
         FROM inventory_records
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [inventoryItemId, userId]
    );
    const item = result.rows[0];
    if (!item || !item.use_for_vaccinations) {
        const error = new Error("Selected inventory item is not available for vaccinations");
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

// Create the same vaccination record for multiple owned animals.
router.post("/bulk", authMiddleware, async (req, res) => {
    const animalIds = normalizeAnimalIds(req.body.animal_ids);
    const normalized = normalizeVaccinationPayload(req.body);

    if (!animalIds.length) {
        return res.status(400).json({ error: "Select at least one animal" });
    }
    if (animalIds.length > 500) {
        return res.status(400).json({ error: "Bulk entries are limited to 500 animals" });
    }
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const vaccination = normalized.value;

    await ensurePremiumRecordSchema();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const ownedAnimals = await client.query(
            `SELECT id
             FROM animals
             WHERE user_id = $1
               AND id = ANY($2::int[])
               AND COALESCE(status, 'active') NOT IN ('archived', 'deceased')`,
            [req.user.id, animalIds]
        );

        if (ownedAnimals.rowCount !== animalIds.length) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "One or more selected animals are unavailable" });
        }

        const usage = await consumeVaccinationInventory(client, req.user.id, req.body, animalIds);
        const result = await client.query(
            `INSERT INTO vaccinations
             (animal_id, vaccine_name, date_given, next_due_date, dosage, notes, inventory_item_id, inventory_quantity_used)
             SELECT animal_id, $2, $3, $4, $5, $6, $7, $8
             FROM unnest($1::int[]) AS selected(animal_id)
             RETURNING *`,
            [
                animalIds,
                vaccination.vaccineName,
                vaccination.dateGiven,
                vaccination.nextDueDate,
                vaccination.dosage,
                vaccination.notes,
                usage.inventoryItemId,
                usage.quantityUsed,
            ]
        );

        await client.query("COMMIT");
        res.status(201).json({ count: result.rowCount, records: result.rows });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        sendRouteError(res, err, "Failed to create bulk vaccinations");
    } finally {
        client.release();
    }
});

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
        sendRouteError(res, err, "Failed to fetch vaccinations");
    }
});

// create a vaccination
router.post("/", authMiddleware, async (req, res) =>{
    const normalized = normalizeVaccinationPayload(req.body, { requireAnimalId: true });
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const vaccination = normalized.value;

    await ensurePremiumRecordSchema();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const animalCheck = await client.query(
            "SELECT id FROM animals WHERE id = $1 AND user_id = $2",
            [vaccination.animalId, req.user.id]
        );
        if (!animalCheck.rowCount) {
            await client.query("ROLLBACK");
            return res.status(403).json({ error: "Unauthorized animal access" });
        }

        const usage = await consumeVaccinationInventory(client, req.user.id, req.body, vaccination.animalId);
        const result = await client.query(
            `
            INSERT INTO vaccinations
            (animal_id, vaccine_name, date_given, next_due_date, dosage, notes, inventory_item_id, inventory_quantity_used)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [
                vaccination.animalId,
                vaccination.vaccineName,
                vaccination.dateGiven,
                vaccination.nextDueDate,
                vaccination.dosage,
                vaccination.notes,
                usage.inventoryItemId,
                usage.quantityUsed,
            ]
        );

        await client.query("COMMIT");
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        sendRouteError(res, err, "Failed to create vaccination");
    } finally {
        client.release();
    }
});

// updating a vaccine
router.put("/:id", authMiddleware, async (req, res) => {
    const { id } = req.params;
    const normalized = normalizeVaccinationPayload(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const vaccination = normalized.value;

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
                vaccination.vaccineName,
                vaccination.dateGiven,
                vaccination.nextDueDate,
                vaccination.dosage,
                vaccination.notes,
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
        sendRouteError(res, err, "Failed to update vaccination");
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
        sendRouteError(res, err, "Failed to delete vaccination");
    }
});

module.exports = router;

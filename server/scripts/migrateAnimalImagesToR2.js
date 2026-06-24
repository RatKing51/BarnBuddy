const pool = require("../data-source");
const { ensureAppSchema } = require("../services/ensureAppSchema");
const {
  createAnimalImageKey,
  deleteObject,
  isR2Configured,
  uploadObject,
  verifyObject,
  verifyR2Connection,
} = require("../services/r2Storage");

const clearDatabaseBlobs = process.argv.includes("--clear-database-blobs");
const cleanupOnly = process.argv.includes("--cleanup-only");
const batchSize = Math.max(
  1,
  Math.min(Number(process.env.R2_MIGRATION_BATCH_SIZE) || 25, 250)
);

function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) return "image/png";

  const header = buffer.subarray(0, 12).toString("ascii");
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) return "image/gif";
  if (header.startsWith("RIFF") && header.endsWith("WEBP")) return "image/webp";

  const boxType = buffer.subarray(4, 8).toString("ascii");
  const brand = buffer.subarray(8, 12).toString("ascii");
  if (boxType === "ftyp" && ["avif", "avis"].includes(brand)) return "image/avif";
  return null;
}

async function migrate() {
  if (!isR2Configured()) {
    throw new Error("Set all R2_* environment variables before running this migration.");
  }

  await ensureAppSchema();
  await verifyR2Connection();

  if (cleanupOnly) {
    const result = await pool.query(
      `SELECT id, image_key
       FROM animals
       WHERE image_data IS NOT NULL
         AND image_key IS NOT NULL
       ORDER BY id ASC`
    );

    let cleaned = 0;
    for (const animal of result.rows) {
      await verifyObject(animal.image_key);
      await pool.query(
        "UPDATE animals SET image_data = NULL WHERE id = $1 AND image_key = $2",
        [animal.id, animal.image_key]
      );
      cleaned += 1;
      console.log(`Verified R2 object and cleared database blob for animal ${animal.id}`);
    }

    console.log(`Cleanup complete. ${cleaned} PostgreSQL blob(s) cleared.`);
    return;
  }

  let migrated = 0;

  while (true) {
    const result = await pool.query(
      `SELECT id, user_id, image_data, image_mime_type
       FROM animals
       WHERE image_data IS NOT NULL
         AND image_key IS NULL
       ORDER BY id ASC
       LIMIT $1`,
      [batchSize]
    );

    if (!result.rows.length) break;

    for (const animal of result.rows) {
      const mimeType =
        detectImageMimeType(animal.image_data) ||
        animal.image_mime_type ||
        "image/jpeg";
      const imageKey = createAnimalImageKey(animal.user_id, animal.id, mimeType);

      await uploadObject({
        key: imageKey,
        body: animal.image_data,
        contentType: mimeType,
      });

      const updateResult = await pool.query(
        `UPDATE animals
         SET image_key = $1,
             image_mime_type = $2
             ${clearDatabaseBlobs ? ", image_data = NULL" : ""}
         WHERE id = $3
           AND image_key IS NULL`,
        [imageKey, mimeType, animal.id]
      );

      if (!updateResult.rowCount) {
        await deleteObject(imageKey);
        continue;
      }

      migrated += 1;
      console.log(`Migrated animal ${animal.id} to ${imageKey}`);
    }
  }

  console.log(
    `Migration complete. ${migrated} image(s) uploaded.${
      clearDatabaseBlobs
        ? " PostgreSQL blobs were cleared after each successful upload."
        : " PostgreSQL blobs were kept for rollback."
    }`
  );
}

migrate()
  .catch((err) => {
    console.error("R2 migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

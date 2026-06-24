const fs = require("fs/promises");
const path = require("path");
const pool = require("../data-source");
const env = require("../config/env");
const { ensureAppSchema } = require("../services/ensureAppSchema");
const {
  createSiteAssetKey,
  createSiteMediaKey,
  deleteObject,
  getPublicObjectUrl,
  isSiteR2Configured,
  uploadObject,
  verifyObject,
  verifyR2Connection,
} = require("../services/r2Storage");

const cleanupOnly = process.argv.includes("--cleanup-only");
const clearDatabaseBlobs = process.argv.includes("--clear-database-blobs");
const publicDirectory = path.resolve(__dirname, "../../client/public");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]);

function mimeTypeForFilename(filename) {
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
  }[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

function publicAssetUrl(filename) {
  const key = createSiteAssetKey(filename);
  return getPublicObjectUrl(key) || `/api/site-content/assets/${path.basename(key)}`;
}

function replaceBundledAssetUrls(value, assetUrls) {
  if (Array.isArray(value)) {
    return value.map((item) => replaceBundledAssetUrls(item, assetUrls));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceBundledAssetUrls(item, assetUrls)])
    );
  }
  if (typeof value !== "string") return value;

  const pathname = value.startsWith("http://") || value.startsWith("https://")
    ? (() => {
        try {
          return new URL(value).pathname;
        } catch {
          return value;
        }
      })()
    : value;
  const filename = path.basename(pathname).toLowerCase();
  return assetUrls.get(filename) || value;
}

async function uploadBundledAssets() {
  const entries = await fs.readdir(publicDirectory, { withFileTypes: true });
  const imageFiles = entries.filter(
    (entry) => entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())
  );
  const assetUrls = new Map();

  for (const file of imageFiles) {
    const body = await fs.readFile(path.join(publicDirectory, file.name));
    const key = createSiteAssetKey(file.name);
    await uploadObject({
      key,
      body,
      contentType: mimeTypeForFilename(file.name),
      cacheControl: "public, max-age=31536000, immutable",
      bucket: env.r2.siteBucket,
    });
    assetUrls.set(file.name.toLowerCase(), publicAssetUrl(file.name));
    console.log(`Uploaded bundled site asset ${file.name} to ${key}`);
  }

  const contentResult = await pool.query(
    `SELECT news_posts, carousel_slides
     FROM site_content
     WHERE id = 'default'
     LIMIT 1`
  );
  if (contentResult.rows.length) {
    const row = contentResult.rows[0];
    const newsPosts = replaceBundledAssetUrls(row.news_posts, assetUrls);
    const carouselSlides = replaceBundledAssetUrls(row.carousel_slides, assetUrls);
    await pool.query(
      `UPDATE site_content
       SET news_posts = $1::jsonb,
           carousel_slides = $2::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 'default'`,
      [JSON.stringify(newsPosts), JSON.stringify(carouselSlides)]
    );
  }

  return imageFiles.length;
}

async function migrateDatabaseMedia() {
  const result = await pool.query(
    `SELECT id, filename, mime_type, data
     FROM site_media
     WHERE data IS NOT NULL
       AND r2_key IS NULL
     ORDER BY id ASC`
  );
  let migrated = 0;

  for (const media of result.rows) {
    const key = createSiteMediaKey(media.filename, media.mime_type);
    await uploadObject({
      key,
      body: media.data,
      contentType: media.mime_type,
      cacheControl: "public, max-age=31536000, immutable",
      bucket: env.r2.siteBucket,
    });
    const updateResult = await pool.query(
      `UPDATE site_media
       SET r2_key = $1,
           size_bytes = OCTET_LENGTH(data)
           ${clearDatabaseBlobs ? ", data = NULL" : ""}
       WHERE id = $2
         AND r2_key IS NULL`,
      [key, media.id]
    );
    if (!updateResult.rowCount) {
      await deleteObject(key, { bucket: env.r2.siteBucket });
      continue;
    }
    migrated += 1;
    console.log(`Migrated admin media ${media.id} to ${key}`);
  }

  return migrated;
}

async function cleanupDatabaseMedia() {
  const result = await pool.query(
    `SELECT id, r2_key
     FROM site_media
     WHERE data IS NOT NULL
       AND r2_key IS NOT NULL
     ORDER BY id ASC`
  );
  let cleaned = 0;

  for (const media of result.rows) {
    await verifyObject(media.r2_key, { bucket: env.r2.siteBucket });
    await pool.query(
      "UPDATE site_media SET data = NULL WHERE id = $1 AND r2_key = $2",
      [media.id, media.r2_key]
    );
    cleaned += 1;
    console.log(`Verified R2 object and cleared database blob for admin media ${media.id}`);
  }

  return cleaned;
}

async function migrate() {
  if (!isSiteR2Configured()) {
    throw new Error("Set R2 credentials and R2_SITE_BUCKET_NAME before running this migration.");
  }

  await ensureAppSchema();
  await verifyR2Connection(env.r2.siteBucket);

  if (cleanupOnly) {
    const cleaned = await cleanupDatabaseMedia();
    console.log(`Site image cleanup complete. ${cleaned} PostgreSQL blob(s) cleared.`);
    return;
  }

  const bundledAssets = await uploadBundledAssets();
  const databaseMedia = await migrateDatabaseMedia();
  console.log(
    `Site image migration complete. ${bundledAssets} bundled asset(s) and ${databaseMedia} admin media item(s) uploaded.${
      clearDatabaseBlobs
        ? " PostgreSQL blobs were cleared after successful uploads."
        : " PostgreSQL blobs were kept for rollback."
    }`
  );
}

migrate()
  .catch((err) => {
    console.error("Site image R2 migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

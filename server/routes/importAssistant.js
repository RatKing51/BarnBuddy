const express = require("express");
const multer = require("multer");
const pool = require("../data-source");
const env = require("../config/env");
const authMiddleware = require("../middleware/authMiddleware");
const {
  isR2Configured,
  uploadObject,
} = require("../services/r2Storage");

const router = express.Router();

const MAX_IMPORT_ROWS = 500;
const MAX_HELP_FILE_SIZE = 15 * 1024 * 1024;
const MAX_AI_FILE_SIZE = 15 * 1024 * 1024;
const HELP_FILE_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.google-apps.document",
  "application/octet-stream",
]);
const HELP_FILE_EXTENSIONS = new Set([
  "csv",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "heic",
  "heif",
  "txt",
  "xls",
  "xlsx",
  "doc",
  "docx",
  "gdoc",
]);
const AI_FILE_EXTENSIONS = new Set([
  "csv",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
  "xls",
  "xlsx",
  "doc",
  "docx",
  "gdoc",
]);
const AI_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const SEX_ALIASES = new Map([
  ["m", "Male"],
  ["male", "Male"],
  ["buck", "Male"],
  ["ram", "Male"],
  ["boar", "Male"],
  ["f", "Female"],
  ["female", "Female"],
  ["doe", "Female"],
  ["ewe", "Female"],
  ["sow", "Female"],
  ["wether", "Wether"],
  ["barrow", "Barrow"],
  ["gilt", "Gilt"],
  ["steer", "Steer"],
  ["bull", "Bull"],
  ["cow", "Cow"],
  ["heifer", "Heifer"],
  ["unknown", "Unknown"],
  ["unk", "Unknown"],
]);

const ALLOWED_SEX_VALUES = new Set([
  "Male",
  "Female",
  "Wether",
  "Barrow",
  "Gilt",
  "Steer",
  "Bull",
  "Cow",
  "Heifer",
  "Unknown",
]);

function cleanText(value) {
  return String(value || "").trim();
}

function sanitizeFilename(filename) {
  return String(filename || "records")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "records";
}

function createHelpRequestFileKey(userId, filename) {
  return `users/${userId}/import-assistant/${Date.now()}-${sanitizeFilename(filename)}`;
}

function normalizeSex(value) {
  const trimmed = cleanText(value);
  if (!trimmed) return "";
  const alias = SEX_ALIASES.get(trimmed.toLowerCase());
  if (alias) return alias;
  const title = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return ALLOWED_SEX_VALUES.has(title) ? title : trimmed;
}

function normalizeDate(value) {
  const trimmed = cleanText(value);
  if (!trimmed) return "";
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function validateImportRow(row, rowNumber) {
  const normalized = {
    name: cleanText(row.name),
    species: cleanText(row.species),
    breed: cleanText(row.breed),
    sex: normalizeSex(row.sex),
    birthdate: cleanText(row.birthdate),
    tagId: cleanText(row.tagId),
    herd: cleanText(row.herd),
    notes: cleanText(row.notes),
  };
  const errors = [];
  const warnings = [];

  if (!normalized.name) errors.push("Name is required");
  if (!normalized.species) errors.push("Species is required");
  if (normalized.birthdate) {
    const date = normalizeDate(normalized.birthdate);
    if (!date) errors.push("Birthdate must be a valid date");
    else normalized.birthdate = date;
  }
  if (normalized.sex && !ALLOWED_SEX_VALUES.has(normalized.sex)) {
    warnings.push(`Unknown sex value "${normalized.sex}"`);
  }

  return { rowNumber, data: normalized, errors, warnings };
}

function buildSafeAiRow(row, index) {
  const normalized = {
    rowNumber: index + 1,
    name: cleanText(row?.name),
    species: cleanText(row?.species),
    breed: cleanText(row?.breed),
    sex: normalizeSex(row?.sex),
    birthdate: cleanText(row?.birthdate),
    tagId: cleanText(row?.tagId || row?.tag_id || row?.tag),
    herd: cleanText(row?.herd || row?.herdName),
    notes: cleanText(row?.notes || row?.comments),
    confidence: Math.max(0, Math.min(Number(row?.confidence) || 0, 1)),
  };
  const validated = validateImportRow(normalized, normalized.rowNumber);
  const warnings = [...validated.warnings];

  if (normalized.confidence > 0 && normalized.confidence < 0.7) {
    warnings.push("Low AI confidence");
  }

  return {
    ...normalized,
    birthdate: validated.data.birthdate,
    errors: validated.errors,
    warnings,
  };
}

function getOpenAiText(responseBody) {
  if (typeof responseBody?.output_text === "string") return responseBody.output_text;

  const chunks = [];
  for (const item of responseBody?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
      if (typeof content.output_text === "string") chunks.push(content.output_text);
    }
  }

  return chunks.join("\n").trim();
}

function parseAiJson(responseBody) {
  const text = getOpenAiText(responseBody);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
}

function getDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

function buildOpenAiInput(file, notes) {
  const instruction = [
    "Extract animal records from this BarnBuddy import file.",
    "Return only animals that are actually present in the record.",
    "If a field is missing or uncertain, use an empty string and explain uncertainty in notes.",
    "Do not invent animals, dates, species, tag IDs, or herds.",
    "Normalize fields when obvious, but preserve user-visible notes.",
    notes ? `User context: ${notes}` : "",
  ].filter(Boolean).join("\n");

  const filePart = AI_IMAGE_MIME_TYPES.has(file.mimetype)
    ? {
        type: "input_image",
        image_url: getDataUrl(file),
        detail: "high",
      }
    : {
        type: "input_file",
        filename: file.originalname || "records",
        file_data: getDataUrl(file),
        detail: file.mimetype === "application/pdf" ? "high" : undefined,
      };

  return [
    {
      role: "user",
      content: [
        filePart,
        {
          type: "input_text",
          text: instruction,
        },
      ],
    },
  ];
}

const animalExtractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    animals: {
      type: "array",
      maxItems: MAX_IMPORT_ROWS,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          species: { type: "string" },
          breed: { type: "string" },
          sex: { type: "string" },
          birthdate: { type: "string" },
          tagId: { type: "string" },
          herd: { type: "string" },
          notes: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["name", "species", "breed", "sex", "birthdate", "tagId", "herd", "notes", "confidence"],
      },
    },
    summary: { type: "string" },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["animals", "summary", "warnings"],
};

function duplicateKey(value) {
  return cleanText(value).toLowerCase();
}

function isDuplicate(row, animals) {
  const name = duplicateKey(row.name);
  const tagId = duplicateKey(row.tagId);
  const species = duplicateKey(row.species);

  return animals.some((animal) => {
    const animalName = duplicateKey(animal.name);
    const animalTag = duplicateKey(animal.tag_id);
    const animalSpecies = duplicateKey(animal.species);
    const sameName = name && animalName === name;
    const sameTag = tagId && animalTag === tagId;
    const sameSpecies = !species || !animalSpecies || animalSpecies === species;
    return sameSpecies && (sameName || sameTag);
  });
}

async function getHerdIdForName(client, userId, herdName) {
  const name = cleanText(herdName);
  if (!name) return null;

  const existing = await client.query(
    "SELECT id FROM herds WHERE user_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1",
    [userId, name]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await client.query(
    "INSERT INTO herds (user_id, name, description, location) VALUES ($1, $2, $3, $4) RETURNING id",
    [userId, name, "Created by BarnBuddy Import Assistant", ""]
  );
  return created.rows[0].id;
}

router.post("/import", authMiddleware, async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const skipDuplicates = req.body?.skipDuplicates !== false;

  if (rows.length === 0) {
    return res.status(400).json({ error: "No rows were provided for import." });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return res.status(400).json({ error: `Imports are limited to ${MAX_IMPORT_ROWS} rows at a time.` });
  }

  const validatedRows = rows.map((row, index) => validateImportRow(row, row.rowNumber || index + 2));
  const invalidRows = validatedRows.filter((row) => row.errors.length > 0);
  if (invalidRows.length > 0) {
    return res.status(400).json({
      error: "Fix rows with errors before importing.",
      rows: invalidRows.map((row) => ({ rowNumber: row.rowNumber, errors: row.errors })),
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingAnimals = await client.query(
      "SELECT name, tag_id, species FROM animals WHERE user_id = $1",
      [req.user.id]
    );
    const imported = [];
    const skipped = [];

    for (const row of validatedRows) {
      if (skipDuplicates && isDuplicate(row.data, existingAnimals.rows)) {
        skipped.push({ rowNumber: row.rowNumber, reason: "Possible duplicate" });
        continue;
      }

      const herdId = await getHerdIdForName(client, req.user.id, row.data.herd);
      const comments = [row.data.notes, row.data.breed ? `Breed: ${row.data.breed}` : ""]
        .filter(Boolean)
        .join("\n");

      const result = await client.query(
        `INSERT INTO animals
          (user_id, herd_id, name, species, sex, birthdate, comments, tag_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         RETURNING id, user_id, herd_id, name, species, sex, birthdate, comments, tag_id, status, created_at`,
        [
          req.user.id,
          herdId,
          row.data.name,
          row.data.species,
          row.data.sex || null,
          row.data.birthdate || null,
          comments,
          row.data.tagId || null,
        ]
      );
      imported.push(result.rows[0]);
      existingAnimals.rows.push({
        name: row.data.name,
        tag_id: row.data.tagId,
        species: row.data.species,
      });
    }

    await client.query("COMMIT");
    res.status(201).json({
      importedCount: imported.length,
      skippedCount: skipped.length,
      skipped,
      animals: imported,
      message: `${imported.length} animals were imported successfully.`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Import Assistant import failed:", err);
    res.status(500).json({ error: "BarnBuddy could not complete the import. Please try again." });
  } finally {
    client.release();
  }
});

const helpUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_HELP_FILE_SIZE },
  fileFilter(req, file, cb) {
    const extension = String(file.originalname || "").split(".").pop().toLowerCase();
    const allowedExtension = HELP_FILE_EXTENSIONS.has(extension);
    if (HELP_FILE_TYPES.has(file.mimetype) && allowedExtension) return cb(null, true);
    cb(new Error("Unsupported import help file type"));
  },
});

const aiUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AI_FILE_SIZE },
  fileFilter(req, file, cb) {
    const extension = String(file.originalname || "").split(".").pop().toLowerCase();
    const allowedExtension = AI_FILE_EXTENSIONS.has(extension);
    if (HELP_FILE_TYPES.has(file.mimetype) && allowedExtension) return cb(null, true);
    cb(new Error("Unsupported import help file type"));
  },
});

router.post("/extract", authMiddleware, aiUpload.single("file"), async (req, res) => {
  if (!env.openai.apiKey) {
    return res.status(503).json({ error: "AI extraction is not configured yet. Add OPENAI_API_KEY on the server." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "Upload a record file for AI review." });
  }

  const extension = String(req.file.originalname || "").split(".").pop().toLowerCase();
  if (extension === "gdoc") {
    return res.status(400).json({
      error: "Google Docs shortcut files do not contain the document. Open the Google Doc and download it as PDF or Word (.docx), then upload that file.",
    });
  }

  let requestId = null;
  try {
    const savedRequest = await pool.query(
      `INSERT INTO import_assistant_requests
        (user_id, record_format, transfer_priority, notes, file_name, file_mime_type, file_size, ai_extraction_status, status)
       VALUES ($1, 'AI extraction', 'Not sure', $2, $3, $4, $5, 'processing', 'ai_processing')
       RETURNING id`,
      [req.user.id, cleanText(req.body.notes), req.file.originalname || null, req.file.mimetype || null, req.file.size || null]
    );
    requestId = savedRequest.rows[0]?.id || null;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.openai.importModel,
        input: buildOpenAiInput(req.file, req.body.notes),
        text: {
          format: {
            type: "json_schema",
            name: "barnbuddy_animal_records",
            strict: true,
            schema: animalExtractionSchema,
          },
        },
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.message || "AI extraction failed.";
      if (requestId) {
        await pool.query(
          "UPDATE import_assistant_requests SET ai_extraction_status = 'failed', ai_extraction_error = $1, status = 'ai_failed', updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3",
          [message, requestId, req.user.id]
        );
      }
      return res.status(response.status >= 500 ? 502 : 400).json({ error: message });
    }

    const parsed = parseAiJson(body);
    if (!parsed || !Array.isArray(parsed.animals)) {
      throw new Error("AI response did not include animal rows.");
    }

    const rows = parsed.animals.slice(0, MAX_IMPORT_ROWS).map(buildSafeAiRow);
    if (requestId) {
      await pool.query(
        `UPDATE import_assistant_requests
         SET ai_extraction_status = 'completed',
             ai_extraction_result = $1,
             status = 'ai_extracted',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3`,
        [JSON.stringify({ ...parsed, animals: rows }), requestId, req.user.id]
      );
    }

    res.json({
      requestId,
      rows,
      summary: cleanText(parsed.summary),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map(cleanText).filter(Boolean) : [],
    });
  } catch (err) {
    console.error("Import Assistant AI extraction failed:", err);
    if (requestId) {
      await pool.query(
        "UPDATE import_assistant_requests SET ai_extraction_status = 'failed', ai_extraction_error = $1, status = 'ai_failed', updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3",
        [err.message || "AI extraction failed.", requestId, req.user.id]
      ).catch(() => {});
    }
    res.status(500).json({ error: "BarnBuddy could not extract records with AI. Please try a clearer file or request transfer help." });
  }
});

router.post("/request", authMiddleware, helpUpload.single("file"), async (req, res) => {
  const recordFormat = cleanText(req.body.recordFormat);
  const transferPriority = cleanText(req.body.transferPriority);
  const notes = cleanText(req.body.notes);
  const fileName = req.file?.originalname || null;
  const fileMimeType = req.file?.mimetype || null;
  const fileSize = req.file?.size || null;

  if (!recordFormat || !transferPriority) {
    return res.status(400).json({ error: "Record format and transfer priority are required." });
  }

  try {
    let fileKey = null;
    let fileData = null;

    if (req.file) {
      if (isR2Configured()) {
        fileKey = createHelpRequestFileKey(req.user.id, req.file.originalname);
        await uploadObject({
          key: fileKey,
          body: req.file.buffer,
          contentType: fileMimeType,
          cacheControl: "private, no-store",
        });
      } else {
        fileData = req.file.buffer;
      }
    }

    const result = await pool.query(
      `INSERT INTO import_assistant_requests
        (user_id, record_format, transfer_priority, notes, file_name, file_mime_type, file_size, file_key, file_data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new')
       RETURNING id, record_format, transfer_priority, notes, file_name, file_mime_type, file_size, status, created_at`,
      [req.user.id, recordFormat, transferPriority, notes, fileName, fileMimeType, fileSize, fileKey, fileData]
    );

    res.status(201).json({
      request: result.rows[0],
      message: "Transfer help request sent.",
    });
  } catch (err) {
    console.error("Import Assistant request failed:", err);
    res.status(500).json({ error: "BarnBuddy could not save your request. Please try again." });
  }
});

module.exports = router;

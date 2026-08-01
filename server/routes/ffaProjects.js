const express = require("express");
const pool = require("../data-source");
const authMiddleware = require("../middleware/authMiddleware");
const { ensureFfaProjectSchema } = require("../services/ensureFfaProjectSchema");

const router = express.Router();
const saeTypes = new Set(["entrepreneurship", "placement", "combined", "agriscience"]);
const projectStatuses = new Set(["active", "completed", "archived"]);
const activityCategories = new Set([
  "Feeding and nutrition",
  "Health and treatment",
  "Grooming",
  "Exercise and handling",
  "Cleaning and facilities",
  "Weight monitoring",
  "Breeding and reproduction",
  "Marketing and sales",
  "Recordkeeping",
  "Showing",
  "Equipment maintenance",
  "Research and education",
  "Other",
]);
const transactionTypes = new Set(["income", "expense"]);

function normalizeText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function requirePremium(req, res, next) {
  if (!req.user?.subscription?.isPremium) {
    return res.status(403).json({
      error: "FFA Project Mode requires BarnBuddy Premium.",
      subscription: req.user?.subscription || null,
    });
  }

  next();
}

function normalizePositiveId(value) {
  const stringValue = String(value ?? "").trim();
  if (!/^\d+$/.test(stringValue)) return null;
  const number = Number(stringValue);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeDate(value) {
  const stringValue = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) return "";
  const [year, month, day] = stringValue.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return "";
  return stringValue;
}

function dateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeOptionalNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function normalizeGoals(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((goal) => normalizeText(goal, 240))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeProjectPayload(body = {}) {
  const name = normalizeText(body.name, 160);
  const schoolYear = normalizeText(body.school_year, 40);
  const saeType = normalizeText(body.sae_type, 40).toLowerCase();
  const startDate = normalizeDate(body.start_date);
  const rawEndDate = String(body.end_date || "").trim();
  const endDate = rawEndDate ? normalizeDate(rawEndDate) : "";
  const status = normalizeText(body.status || "active", 30).toLowerCase();

  if (!name) return { error: "Project name is required." };
  if (!schoolYear) return { error: "School year is required." };
  if (!saeTypes.has(saeType)) return { error: "Select a valid SAE type." };
  if (!startDate) return { error: "A valid project start date is required." };
  if (rawEndDate && !endDate) return { error: "Enter a valid project end date." };
  if (endDate && endDate < startDate) return { error: "Project end date cannot be before its start date." };
  if (!projectStatuses.has(status)) return { error: "Select a valid project status." };
  const advisorEmail = normalizeText(body.advisor_email, 254).toLowerCase();
  if (advisorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(advisorEmail)) {
    return { error: "Enter a valid advisor email address." };
  }

  return {
    value: {
      name,
      school_year: schoolYear,
      sae_type: saeType,
      chapter_name: normalizeText(body.chapter_name, 180),
      advisor_name: normalizeText(body.advisor_name, 160),
      advisor_email: advisorEmail,
      description: normalizeText(body.description, 4000),
      start_date: startDate,
      end_date: endDate || null,
      status,
      goals: normalizeGoals(body.goals),
    },
  };
}

function normalizeAnimalLinks(value, projectStartDate, projectEndDate = null) {
  if (!Array.isArray(value)) return { value: [] };
  if (value.length > 100) return { error: "A project can include up to 100 animals." };

  const links = [];
  const seen = new Set();
  for (const entry of value) {
    const animalId = normalizePositiveId(typeof entry === "object" ? entry.animal_id : entry);
    if (!animalId) return { error: "One or more selected animals are invalid." };
    if (seen.has(animalId)) continue;
    seen.add(animalId);

    const startingWeight = normalizeOptionalNumber(entry?.starting_weight, { min: 0.01, max: 1_000_000 });
    if (entry?.starting_weight !== "" && entry?.starting_weight != null && startingWeight === null) {
      return { error: "Starting weights must be greater than zero." };
    }
    const startingValue = normalizeOptionalNumber(entry?.starting_value, { min: 0, max: 100_000_000 });
    if (entry?.starting_value !== "" && entry?.starting_value != null && startingValue === null) {
      return { error: "Starting values cannot be negative." };
    }
    const ownership = normalizeOptionalNumber(entry?.ownership_percentage, { min: 0.01, max: 100 });
    if (entry?.ownership_percentage !== "" && entry?.ownership_percentage != null && ownership === null) {
      return { error: "Ownership percentage must be between 0 and 100." };
    }
    const rawRecordsFromDate = String(entry?.records_from_date || "").trim();
    const recordsFromDate = rawRecordsFromDate ? normalizeDate(rawRecordsFromDate) : projectStartDate;
    if (!recordsFromDate) return { error: "Enter a valid animal record start date." };
    if (recordsFromDate < projectStartDate || (projectEndDate && recordsFromDate > projectEndDate)) {
      return { error: "Animal record dates must fall within the project dates." };
    }

    links.push({
      animal_id: animalId,
      starting_weight: startingWeight,
      starting_value: startingValue ?? 0,
      ownership_percentage: ownership ?? 100,
      records_from_date: recordsFromDate,
    });
  }

  return { value: links };
}

async function getOwnedProject(projectId, userId, queryable = pool) {
  const id = normalizePositiveId(projectId);
  if (!id) return null;
  const result = await queryable.query(
    "SELECT * FROM ffa_projects WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return result.rows[0] || null;
}

async function getLinkedAnimal(projectId, userId, animalId, queryable = pool) {
  if (!animalId) return null;
  const result = await queryable.query(
    `SELECT a.id, a.name, a.species, a.tag_id
     FROM ffa_project_animals pa
     JOIN animals a ON a.id = pa.animal_id AND a.user_id = pa.user_id
     WHERE pa.project_id = $1 AND pa.user_id = $2 AND pa.animal_id = $3`,
    [projectId, userId, animalId]
  );
  return result.rows[0] || null;
}

async function insertAnimalLinks(client, project, userId, links) {
  if (!links.length) return [];
  const animalIds = links.map((link) => link.animal_id);
  const ownedAnimals = await client.query(
    `SELECT id, name, species, tag_id, weight
     FROM animals
     WHERE user_id = $1 AND id = ANY($2::int[])`,
    [userId, animalIds]
  );
  if (ownedAnimals.rowCount !== animalIds.length) {
    const error = new Error("One or more selected animals were not found.");
    error.status = 400;
    throw error;
  }

  const animalsById = new Map(ownedAnimals.rows.map((animal) => [animal.id, animal]));
  const inserted = [];
  for (const link of links) {
    const animal = animalsById.get(link.animal_id);
    const result = await client.query(
      `INSERT INTO ffa_project_animals
       (user_id, project_id, animal_id, animal_name, species, tag_id, starting_weight,
        starting_value, ownership_percentage, records_from_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        project.id,
        animal.id,
        animal.name || "",
        animal.species || "",
        animal.tag_id || "",
        link.starting_weight ?? normalizeOptionalNumber(animal.weight, { min: 0.01, max: 1_000_000 }),
        link.starting_value,
        link.ownership_percentage,
        link.records_from_date || dateOnly(project.start_date),
      ]
    );
    inserted.push(result.rows[0]);
  }
  return inserted;
}

function projectDateContains(project, value) {
  const date = normalizeDate(value);
  if (!date) return false;
  const start = dateOnly(project.start_date);
  const end = dateOnly(project.end_date);
  return date >= start && (!end || date <= end);
}

async function fetchProjectDetails(projectId, userId) {
  const project = await getOwnedProject(projectId, userId);
  if (!project) return null;

  const [animalsResult, activitiesResult, financesResult, linkedRecordResult] = await Promise.all([
    pool.query(
      `SELECT pa.*, a.weight AS current_weight, a.status AS current_status
       FROM ffa_project_animals pa
       LEFT JOIN animals a ON a.id = pa.animal_id AND a.user_id = pa.user_id
       WHERE pa.project_id = $1 AND pa.user_id = $2
       ORDER BY pa.created_at, pa.id`,
      [project.id, userId]
    ),
    pool.query(
      `SELECT * FROM ffa_project_activities
       WHERE project_id = $1 AND user_id = $2
       ORDER BY activity_date DESC, id DESC`,
      [project.id, userId]
    ),
    pool.query(
      `SELECT * FROM ffa_project_finances
       WHERE project_id = $1 AND user_id = $2
       ORDER BY transaction_date DESC, id DESC`,
      [project.id, userId]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM weight_records wr
          JOIN ffa_project_animals pa ON pa.animal_id = wr.animal_id
          WHERE pa.project_id = $1 AND pa.user_id = $2 AND wr.user_id = $2
            AND wr.recorded_date >= pa.records_from_date
            AND ($3::date IS NULL OR wr.recorded_date <= $3::date)) AS weight_records,
         (SELECT COUNT(*)::int
          FROM vaccinations v
          JOIN animals a ON a.id = v.animal_id AND a.user_id = $2
          JOIN ffa_project_animals pa ON pa.animal_id = a.id AND pa.project_id = $1 AND pa.user_id = $2
          WHERE v.date_given >= pa.records_from_date
            AND ($3::date IS NULL OR v.date_given <= $3::date)) AS vaccinations,
         (SELECT COUNT(*)::int
          FROM health_events he
          JOIN animals a ON a.id = he.animal_id AND a.user_id = $2
          JOIN ffa_project_animals pa ON pa.animal_id = a.id AND pa.project_id = $1 AND pa.user_id = $2
          WHERE he.event_date >= pa.records_from_date
            AND ($3::date IS NULL OR he.event_date <= $3::date)) AS health_events,
         (SELECT COUNT(*)::int
          FROM vet_visits vv
          JOIN animals a ON a.id = vv.animal_id AND a.user_id = $2
          JOIN ffa_project_animals pa ON pa.animal_id = a.id AND pa.project_id = $1 AND pa.user_id = $2
          WHERE vv.visit_date >= pa.records_from_date
            AND ($3::date IS NULL OR vv.visit_date <= $3::date)) AS vet_visits,
         (SELECT COUNT(*)::int
          FROM feed_records fr
          JOIN ffa_project_animals pa ON pa.animal_id = fr.animal_id
          WHERE pa.project_id = $1 AND pa.user_id = $2 AND fr.user_id = $2
            AND fr.record_date >= pa.records_from_date
            AND ($3::date IS NULL OR fr.record_date <= $3::date)) AS feed_records,
         (SELECT COUNT(*)::int
          FROM finance_records fin
          JOIN ffa_project_animals pa ON pa.animal_id = fin.animal_id
          WHERE pa.project_id = $1 AND pa.user_id = $2 AND fin.user_id = $2
            AND fin.record_date >= pa.records_from_date
            AND ($3::date IS NULL OR fin.record_date <= $3::date)) AS finance_records`,
      [project.id, userId, project.end_date || null]
    ),
  ]);

  const animals = animalsResult.rows;
  const activities = activitiesResult.rows;
  const finances = financesResult.rows;
  const income = finances
    .filter((item) => item.transaction_type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = finances
    .filter((item) => item.transaction_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const minutes = activities.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const startingInvestment = animals.reduce(
    (sum, animal) => sum + Number(animal.starting_value || 0) * (Number(animal.ownership_percentage || 0) / 100),
    0
  );

  return {
    project,
    animals,
    activities,
    finances,
    linkedRecordSummary: linkedRecordResult.rows[0] || {},
    summary: {
      animalCount: animals.length,
      totalMinutes: minutes,
      totalHours: Math.round((minutes / 60) * 10) / 10,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      profit: Math.round((income - expenses) * 100) / 100,
      startingInvestment: Math.round(startingInvestment * 100) / 100,
      startingWeight: animals.reduce((sum, animal) => sum + Number(animal.starting_weight || 0), 0),
      currentWeight: animals.reduce((sum, animal) => sum + Number(animal.current_weight || 0), 0),
    },
  };
}

router.use(authMiddleware);
router.use(requirePremium);
router.use(async (req, res, next) => {
  try {
    await ensureFfaProjectSchema();
    next();
  } catch (error) {
    console.error("Failed to prepare FFA project schema:", error);
    res.status(500).json({ error: "FFA Project Mode is temporarily unavailable." });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
         (SELECT COUNT(*)::int FROM ffa_project_animals pa WHERE pa.project_id = p.id AND pa.user_id = p.user_id) AS animal_count,
         (SELECT COALESCE(SUM(duration_minutes), 0)::int FROM ffa_project_activities a WHERE a.project_id = p.id AND a.user_id = p.user_id) AS total_minutes,
         (SELECT COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) FROM ffa_project_finances f WHERE f.project_id = p.id AND f.user_id = p.user_id) AS income,
         (SELECT COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) FROM ffa_project_finances f WHERE f.project_id = p.id AND f.user_id = p.user_id) AS expenses
       FROM ffa_projects p
       WHERE p.user_id = $1
       ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END, p.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to list FFA projects:", error);
    res.status(500).json({ error: "Failed to load FFA projects." });
  }
});

router.post("/", async (req, res) => {
  const normalized = normalizeProjectPayload(req.body);
  if (normalized.error) return res.status(400).json({ error: normalized.error });
  const animalLinks = normalizeAnimalLinks(
    req.body.animals,
    normalized.value.start_date,
    normalized.value.end_date
  );
  if (animalLinks.error) return res.status(400).json({ error: animalLinks.error });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = normalized.value;
    const result = await client.query(
      `INSERT INTO ffa_projects
       (user_id, name, school_year, sae_type, chapter_name, advisor_name, advisor_email,
        description, start_date, end_date, status, goals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       RETURNING *`,
      [
        req.user.id, value.name, value.school_year, value.sae_type, value.chapter_name,
        value.advisor_name, value.advisor_email, value.description, value.start_date,
        value.end_date, value.status, JSON.stringify(value.goals),
      ]
    );
    const project = result.rows[0];
    await insertAnimalLinks(client, project, req.user.id, animalLinks.value);
    await client.query("COMMIT");
    res.status(201).json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create FFA project:", error);
    const expectedError = Boolean(error.status || error.code === "23505");
    res.status(error.status || (error.code === "23505" ? 409 : 500)).json({
      error: expectedError
        ? error.message || "An animal is already linked to this project."
        : "Failed to create FFA project.",
    });
  } finally {
    client.release();
  }
});

router.get("/:id", async (req, res) => {
  try {
    const details = await fetchProjectDetails(req.params.id, req.user.id);
    if (!details) return res.status(404).json({ error: "FFA project not found." });
    res.json(details);
  } catch (error) {
    console.error("Failed to load FFA project:", error);
    res.status(500).json({ error: "Failed to load FFA project." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const existing = await getOwnedProject(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: "FFA project not found." });
    const normalized = normalizeProjectPayload({ ...existing, ...req.body });
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const value = normalized.value;
    await pool.query(
      `UPDATE ffa_projects SET
         name = $1, school_year = $2, sae_type = $3, chapter_name = $4,
         advisor_name = $5, advisor_email = $6, description = $7, start_date = $8,
         end_date = $9, status = $10, goals = $11::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13`,
      [
        value.name, value.school_year, value.sae_type, value.chapter_name, value.advisor_name,
        value.advisor_email, value.description, value.start_date, value.end_date, value.status,
        JSON.stringify(value.goals), existing.id, req.user.id,
      ]
    );
    res.json(await fetchProjectDetails(existing.id, req.user.id));
  } catch (error) {
    console.error("Failed to update FFA project:", error);
    res.status(500).json({ error: "Failed to update FFA project." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM ffa_projects WHERE id = $1 AND user_id = $2 RETURNING id",
      [normalizePositiveId(req.params.id), req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "FFA project not found." });
    res.json({ message: "FFA project deleted." });
  } catch (error) {
    console.error("Failed to delete FFA project:", error);
    res.status(500).json({ error: "Failed to delete FFA project." });
  }
});

router.post("/:id/animals", async (req, res) => {
  const projectId = normalizePositiveId(req.params.id);
  try {
    const project = await getOwnedProject(projectId, req.user.id);
    if (!project) return res.status(404).json({ error: "FFA project not found." });
    const links = normalizeAnimalLinks(
      req.body.animals,
      dateOnly(project.start_date),
      dateOnly(project.end_date) || null
    );
    if (links.error) return res.status(400).json({ error: links.error });
    if (!links.value.length) return res.status(400).json({ error: "Select at least one animal." });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await insertAnimalLinks(client, project, req.user.id, links.value);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    res.status(201).json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to add project animals:", error);
    const expectedError = Boolean(error.status || error.code === "23505");
    res.status(error.status || (error.code === "23505" ? 409 : 500)).json({
      error: expectedError
        ? error.message || "That animal is already in the project."
        : "Failed to add animals.",
    });
  }
});

router.patch("/:id/animals/:linkId", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    const linkId = normalizePositiveId(req.params.linkId);
    if (!project || !linkId) return res.status(404).json({ error: "Project animal not found." });
    const current = await pool.query(
      "SELECT * FROM ffa_project_animals WHERE id = $1 AND project_id = $2 AND user_id = $3",
      [linkId, project.id, req.user.id]
    );
    if (!current.rowCount) return res.status(404).json({ error: "Project animal not found." });
    const row = current.rows[0];
    const startingWeight = req.body.starting_weight === "" ? null : normalizeOptionalNumber(req.body.starting_weight ?? row.starting_weight, { min: 0.01, max: 1_000_000 });
    const startingValue = normalizeOptionalNumber(req.body.starting_value ?? row.starting_value, { min: 0, max: 100_000_000 });
    const ownership = normalizeOptionalNumber(req.body.ownership_percentage ?? row.ownership_percentage, { min: 0.01, max: 100 });
    const recordsFromDate = normalizeDate(req.body.records_from_date ?? dateOnly(row.records_from_date));
    if ((req.body.starting_weight !== "" && startingWeight === null) || startingValue === null || ownership === null || !recordsFromDate) {
      return res.status(400).json({ error: "Enter valid snapshot values and dates." });
    }
    if (!projectDateContains(project, recordsFromDate)) {
      return res.status(400).json({ error: "Animal record dates must fall within the project dates." });
    }
    await pool.query(
      `UPDATE ffa_project_animals SET starting_weight = $1, starting_value = $2,
         ownership_percentage = $3, records_from_date = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND project_id = $6 AND user_id = $7`,
      [startingWeight, startingValue, ownership, recordsFromDate, linkId, project.id, req.user.id]
    );
    res.json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to update project animal:", error);
    res.status(500).json({ error: "Failed to update project animal." });
  }
});

router.delete("/:id/animals/:linkId", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: "FFA project not found." });
    const result = await pool.query(
      "DELETE FROM ffa_project_animals WHERE id = $1 AND project_id = $2 AND user_id = $3 RETURNING id",
      [normalizePositiveId(req.params.linkId), project.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Project animal not found." });
    res.json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to remove project animal:", error);
    res.status(500).json({ error: "Failed to remove project animal." });
  }
});

function normalizeActivityPayload(body, project) {
  const activityDate = normalizeDate(body.activity_date);
  const category = activityCategories.has(body.category) ? body.category : "Other";
  const title = normalizeText(body.title, 160);
  const duration = Number(body.duration_minutes);
  const animalId = body.animal_id ? normalizePositiveId(body.animal_id) : null;
  if (!title) return { error: "Activity title is required." };
  if (!projectDateContains(project, activityDate)) return { error: "Activity date must fall within the project dates." };
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) return { error: "Activity time must be between 1 minute and 24 hours." };
  if (body.animal_id && !animalId) return { error: "Select a valid project animal." };
  return { value: {
    activity_date: activityDate,
    category,
    title,
    duration_minutes: duration,
    animal_id: animalId,
    description: normalizeText(body.description, 4000),
    skills_learned: normalizeText(body.skills_learned, 1200),
    reflection: normalizeText(body.reflection, 2400),
  } };
}

router.post("/:id/activities", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: "FFA project not found." });
    const normalized = normalizeActivityPayload(req.body, project);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const animal = await getLinkedAnimal(project.id, req.user.id, normalized.value.animal_id);
    if (normalized.value.animal_id && !animal) return res.status(400).json({ error: "Selected animal is not in this project." });
    const value = normalized.value;
    await pool.query(
      `INSERT INTO ffa_project_activities
       (user_id, project_id, animal_id, animal_name, activity_date, category, title,
        description, duration_minutes, skills_learned, reflection)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [req.user.id, project.id, value.animal_id, animal?.name || "", value.activity_date,
        value.category, value.title, value.description, value.duration_minutes,
        value.skills_learned, value.reflection]
    );
    res.status(201).json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to add FFA activity:", error);
    res.status(500).json({ error: "Failed to add project activity." });
  }
});

router.put("/:id/activities/:activityId", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    const activityId = normalizePositiveId(req.params.activityId);
    if (!project || !activityId) return res.status(404).json({ error: "Project activity not found." });
    const normalized = normalizeActivityPayload(req.body, project);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const animal = await getLinkedAnimal(project.id, req.user.id, normalized.value.animal_id);
    if (normalized.value.animal_id && !animal) return res.status(400).json({ error: "Selected animal is not in this project." });
    const value = normalized.value;
    const result = await pool.query(
      `UPDATE ffa_project_activities SET animal_id = $1, animal_name = $2, activity_date = $3,
         category = $4, title = $5, description = $6, duration_minutes = $7,
         skills_learned = $8, reflection = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND project_id = $11 AND user_id = $12 RETURNING id`,
      [value.animal_id, animal?.name || "", value.activity_date, value.category, value.title,
        value.description, value.duration_minutes, value.skills_learned, value.reflection,
        activityId, project.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Project activity not found." });
    res.json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to update FFA activity:", error);
    res.status(500).json({ error: "Failed to update project activity." });
  }
});

router.delete("/:id/activities/:activityId", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: "FFA project not found." });
    const result = await pool.query(
      "DELETE FROM ffa_project_activities WHERE id = $1 AND project_id = $2 AND user_id = $3 RETURNING id",
      [normalizePositiveId(req.params.activityId), project.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Project activity not found." });
    res.json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to delete FFA activity:", error);
    res.status(500).json({ error: "Failed to delete project activity." });
  }
});

function normalizeFinancePayload(body, project) {
  const transactionDate = normalizeDate(body.transaction_date);
  const transactionType = normalizeText(body.transaction_type, 20).toLowerCase();
  const amount = normalizeOptionalNumber(body.amount, { min: 0.01, max: 100_000_000 });
  const category = normalizeText(body.category, 120);
  const animalId = body.animal_id ? normalizePositiveId(body.animal_id) : null;
  if (!projectDateContains(project, transactionDate)) return { error: "Transaction date must fall within the project dates." };
  if (!transactionTypes.has(transactionType)) return { error: "Select income or expense." };
  if (amount === null) return { error: "Amount must be greater than zero." };
  if (!category) return { error: "Finance category is required." };
  if (body.animal_id && !animalId) return { error: "Select a valid project animal." };
  return { value: {
    transaction_date: transactionDate,
    transaction_type: transactionType,
    amount,
    category,
    animal_id: animalId,
    vendor: normalizeText(body.vendor, 180),
    notes: normalizeText(body.notes, 2400),
  } };
}

router.post("/:id/finances", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: "FFA project not found." });
    const normalized = normalizeFinancePayload(req.body, project);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const animal = await getLinkedAnimal(project.id, req.user.id, normalized.value.animal_id);
    if (normalized.value.animal_id && !animal) return res.status(400).json({ error: "Selected animal is not in this project." });
    const value = normalized.value;
    await pool.query(
      `INSERT INTO ffa_project_finances
       (user_id, project_id, animal_id, animal_name, transaction_date, transaction_type,
        category, amount, vendor, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [req.user.id, project.id, value.animal_id, animal?.name || "", value.transaction_date,
        value.transaction_type, value.category, value.amount, value.vendor, value.notes]
    );
    res.status(201).json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to add FFA finance entry:", error);
    res.status(500).json({ error: "Failed to add project finance entry." });
  }
});

router.put("/:id/finances/:financeId", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    const financeId = normalizePositiveId(req.params.financeId);
    if (!project || !financeId) return res.status(404).json({ error: "Finance entry not found." });
    const normalized = normalizeFinancePayload(req.body, project);
    if (normalized.error) return res.status(400).json({ error: normalized.error });
    const animal = await getLinkedAnimal(project.id, req.user.id, normalized.value.animal_id);
    if (normalized.value.animal_id && !animal) return res.status(400).json({ error: "Selected animal is not in this project." });
    const value = normalized.value;
    const result = await pool.query(
      `UPDATE ffa_project_finances SET animal_id = $1, animal_name = $2, transaction_date = $3,
         transaction_type = $4, category = $5, amount = $6, vendor = $7, notes = $8,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND project_id = $10 AND user_id = $11 RETURNING id`,
      [value.animal_id, animal?.name || "", value.transaction_date, value.transaction_type,
        value.category, value.amount, value.vendor, value.notes, financeId, project.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Finance entry not found." });
    res.json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to update FFA finance entry:", error);
    res.status(500).json({ error: "Failed to update project finance entry." });
  }
});

router.delete("/:id/finances/:financeId", async (req, res) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user.id);
    if (!project) return res.status(404).json({ error: "FFA project not found." });
    const result = await pool.query(
      "DELETE FROM ffa_project_finances WHERE id = $1 AND project_id = $2 AND user_id = $3 RETURNING id",
      [normalizePositiveId(req.params.financeId), project.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "Finance entry not found." });
    res.json(await fetchProjectDetails(project.id, req.user.id));
  } catch (error) {
    console.error("Failed to delete FFA finance entry:", error);
    res.status(500).json({ error: "Failed to delete project finance entry." });
  }
});

module.exports = router;
module.exports.normalizeAnimalLinks = normalizeAnimalLinks;
module.exports.normalizeProjectPayload = normalizeProjectPayload;
module.exports.normalizeActivityPayload = normalizeActivityPayload;
module.exports.normalizeFinancePayload = normalizeFinancePayload;
module.exports.requirePremium = requirePremium;

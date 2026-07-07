import React, { useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { extractRecordsWithAi, importAnimals, sendImportHelpRequest } from "../api/importAssistant";

const TEMPLATE_HEADERS = "name,species,breed,sex,birthdate,tagId,herd,notes";
const TEMPLATE_EXAMPLE = "Bella,Goat,Boer,Female,2024-03-12,103,Show Herd,Market doe";
const MAX_ROWS = 500;
const HELP_FILE_ACCEPT = ".csv,.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.txt,.xls,.xlsx,.doc,.docx,text/csv,application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const AI_FILE_ACCEPT = ".csv,.pdf,.png,.jpg,.jpeg,.webp,.txt,.xls,.xlsx,.doc,.docx,.gdoc,text/csv,application/pdf,image/png,image/jpeg,image/webp,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const COLUMN_ALIASES = {
  name: ["name", "animal name"],
  species: ["species", "type", "animal type"],
  breed: ["breed"],
  sex: ["sex", "gender"],
  birthdate: ["birthdate", "birth date", "date of birth", "dob"],
  tagId: ["tagid", "tag_id", "tag", "tag id", "ear tag"],
  herd: ["herdid", "herd_id", "herd", "herd name", "group"],
  notes: ["notes", "comments", "comment"],
};

const SEX_ALIASES = {
  m: "Male",
  male: "Male",
  buck: "Male",
  ram: "Male",
  boar: "Male",
  f: "Female",
  female: "Female",
  doe: "Female",
  ewe: "Female",
  sow: "Female",
  wether: "Wether",
  barrow: "Barrow",
  gilt: "Gilt",
  steer: "Steer",
  bull: "Bull",
  cow: "Cow",
  heifer: "Heifer",
  unknown: "Unknown",
  unk: "Unknown",
};

const ALLOWED_SEX = new Set([
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

const FIELD_LABELS = [
  ["name", "Name"],
  ["species", "Species"],
  ["breed", "Breed"],
  ["sex", "Sex"],
  ["birthdate", "Birthdate"],
  ["tagId", "Tag ID"],
  ["herd", "Herd"],
  ["notes", "Notes"],
];

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      rows.push(row);
      current = "";
      row = [];
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  if (inQuotes) throw new Error("Invalid CSV format");
  return rows.filter((item) => item.some((cell) => String(cell || "").trim()));
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function buildHeaderMap(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const map = {};
  const unknown = [];

  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.map(normalizeHeader).includes(header)
    );
    if (index >= 0) map[field] = index;
  });

  headers.forEach((header, index) => {
    const matched = Object.values(map).includes(index);
    if (!matched && String(header || "").trim()) unknown.push(header.trim());
  });

  return { map, unknown };
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeSex(value) {
  const trimmed = clean(value);
  if (!trimmed) return "";
  const alias = SEX_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  const title = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return ALLOWED_SEX.has(title) ? title : trimmed;
}

function normalizeDate(value) {
  const trimmed = clean(value);
  if (!trimmed) return "";
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function validateRow(row, existingAnimals) {
  const errors = [];
  const warnings = [...row.headerWarnings];
  const data = { ...row.data, sex: normalizeSex(row.data.sex) };

  if (!data.name) errors.push("Missing name");
  if (!data.species) errors.push("Missing species");
  if (data.birthdate) {
    const date = normalizeDate(data.birthdate);
    if (!date) errors.push("Invalid birthdate");
    else data.birthdate = date;
  }
  if (data.sex && !ALLOWED_SEX.has(data.sex)) warnings.push("Unknown sex value");

  const duplicate = existingAnimals.some((animal) => {
    const sameSpecies =
      !data.species ||
      !animal.species ||
      animal.species.toLowerCase() === data.species.toLowerCase();
    const sameName = data.name && animal.name?.toLowerCase() === data.name.toLowerCase();
    const sameTag = data.tagId && animal.tag_id?.toLowerCase() === data.tagId.toLowerCase();
    return sameSpecies && (sameName || sameTag);
  });
  if (duplicate) warnings.push("Possible duplicate");

  return { ...row, data, errors, warnings: [...new Set(warnings)], duplicate };
}

function getStatus(row) {
  if (row.removed) return { label: "Removed", className: "bg-gray-700 text-gray-200" };
  if (row.errors.length) return { label: "Needs fixes", className: "bg-red-500/15 text-red-200" };
  if (row.warnings.length) return { label: row.warnings.join(", "), className: "bg-amber-500/15 text-amber-100" };
  return { label: "Ready", className: "bg-emerald-500/15 text-emerald-100" };
}

export default function ImportAssistant({ animals = [], onAddCurrentAnimal, onImported, onViewAnimals }) {
  const fileInputRef = useRef(null);
  const aiFileRef = useRef(null);
  const helpFileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [aiFile, setAiFile] = useState(null);
  const [aiNotes, setAiNotes] = useState("");
  const [aiMessage, setAiMessage] = useState("Upload a PDF, Word doc, spreadsheet, text file, or clear record photo for AI review.");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("No file selected");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successCount, setSuccessCount] = useState(null);
  const [helpForm, setHelpForm] = useState({
    recordFormat: "",
    transferPriority: "",
    notes: "",
    file: null,
  });
  const [helpSubmitting, setHelpSubmitting] = useState(false);

  const validatedRows = useMemo(
    () => rows.map((row) => validateRow(row, animals)),
    [rows, animals]
  );
  const counts = useMemo(() => {
    const active = validatedRows.filter((row) => !row.removed);
    const errors = active.filter((row) => row.errors.length > 0).length;
    const duplicates = active.filter((row) => row.duplicate).length;
    const ready = active.filter((row) => row.errors.length === 0 && (!skipDuplicates || !row.duplicate)).length;
    return {
      total: validatedRows.length,
      ready,
      errors,
      removed: validatedRows.filter((row) => row.removed).length,
      skippedDuplicates: skipDuplicates ? duplicates : 0,
    };
  }, [skipDuplicates, validatedRows]);

  const handleTemplateDownload = () => {
    const blob = new Blob([`${TEMPLATE_HEADERS}\n${TEMPLATE_EXAMPLE}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "barnbuddy-import-assistant-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file) => {
    if (!file) {
      setMessage("No file selected");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setRows([]);
      setFileName("");
      setMessage("Wrong file type. Choose a CSV file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setRows([]);
      setMessage("CSV file is too large. Keep imports under 2MB and 500 rows.");
      return;
    }

    try {
      setIsParsing(true);
      setMessage("Parsing spreadsheet...");
      const text = await file.text();
      if (!text.trim()) throw new Error("Empty file");
      const csvRows = parseCsv(text);
      if (csvRows.length < 2) throw new Error("CSV must include headers and at least one animal row");
      if (csvRows.length - 1 > MAX_ROWS) throw new Error(`Imports are limited to ${MAX_ROWS} rows`);

      const headers = csvRows[0];
      const { map, unknown } = buildHeaderMap(headers);
      if (map.name === undefined || map.species === undefined) {
        throw new Error("Missing required columns: name and species");
      }

      const parsedRows = csvRows.slice(1).map((cells, index) => ({
        id: `${Date.now()}-${index}`,
        rowNumber: index + 2,
        removed: false,
        headerWarnings: unknown.length ? [`Unknown optional column${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`] : [],
        data: Object.fromEntries(
          FIELD_LABELS.map(([field]) => [field, clean(cells[map[field]])])
        ),
      }));

      setRows(parsedRows);
      setFileName(file.name);
      setSuccessCount(null);
      setShowConfirmation(false);
      setMessage("Review your animals before importing");
    } catch (err) {
      setRows([]);
      setFileName("");
      setMessage(err.message || "Invalid CSV format");
    } finally {
      setIsParsing(false);
    }
  };

  const handleAiFile = (file) => {
    setAiFile(file || null);
    if (!file) {
      setAiMessage("Upload a PDF, Word doc, spreadsheet, text file, or clear record photo for AI review.");
      return;
    }
    setAiMessage(`${file.name} is ready for AI review.`);
  };

  const handleAiExtract = async () => {
    if (!aiFile) {
      setAiMessage("Choose a record file first.");
      return;
    }
    if (aiFile.size > 15 * 1024 * 1024) {
      setAiMessage("File is too large. Keep AI review uploads under 15MB.");
      return;
    }

    try {
      setIsExtracting(true);
      setSuccessCount(null);
      setShowConfirmation(false);
      setAiMessage("AI is reading your records...");
      setMessage("AI is extracting animal rows for review...");
      const res = await extractRecordsWithAi({ file: aiFile, notes: aiNotes });
      const extractedRows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      const now = Date.now();

      if (extractedRows.length === 0) {
        setAiMessage("AI did not find animal rows in that file.");
        setRows([]);
        return;
      }

      setRows(extractedRows.map((row, index) => {
        const confidenceWarning =
          row.confidence && row.confidence < 0.7
            ? [`Low AI confidence (${Math.round(row.confidence * 100)}%)`]
            : [];
        return {
          id: `ai-${now}-${index}`,
          rowNumber: index + 1,
          removed: false,
          headerWarnings: [...(row.warnings || []), ...confidenceWarning],
          data: Object.fromEntries(
            FIELD_LABELS.map(([field]) => [field, clean(row[field])])
          ),
        };
      }));
      setFileName(aiFile.name);
      setAiMessage(res.data?.summary || `AI found ${extractedRows.length} possible animal row${extractedRows.length === 1 ? "" : "s"}.`);
      setMessage("Review AI-extracted animals before importing");
      if (Array.isArray(res.data?.warnings) && res.data.warnings.length) {
        toast.info(res.data.warnings.slice(0, 2).join(" "));
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "AI extraction failed. Try a clearer file or request transfer help.";
      setAiMessage(errorMessage);
      setMessage(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };

  const updateRow = (id, field, value) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, data: { ...row.data, [field]: value } } : row
      )
    );
  };

  const removeRow = (id) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, removed: true } : row)));
  };

  const restoreRow = (id) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, removed: false } : row)));
  };

  const readyRows = validatedRows.filter(
    (row) => !row.removed && row.errors.length === 0 && (!skipDuplicates || !row.duplicate)
  );

  const handleImport = async () => {
    if (counts.errors > 0) {
      setMessage("Fix rows with errors before importing");
      return;
    }
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    if (readyRows.length === 0) {
      setMessage("No ready rows to import");
      return;
    }

    try {
      setIsImporting(true);
      const res = await importAnimals(
        readyRows.map((row) => ({ rowNumber: row.rowNumber, ...row.data })),
        { skipDuplicates }
      );
      const imported = res.data?.importedCount || 0;
      setSuccessCount(imported);
      setShowConfirmation(false);
      setMessage("Import complete");
      onImported?.(res.data?.animals || []);
      toast.success(`${imported} animals were imported successfully.`);
    } catch (err) {
      const rowErrors = err.response?.data?.rows;
      if (Array.isArray(rowErrors) && rowErrors.length) {
        setMessage(rowErrors.map((row) => `Row ${row.rowNumber}: ${row.errors.join(", ")}`).join(" | "));
      } else {
        setMessage(err.response?.data?.error || "Network failure while importing animals.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportAnother = () => {
    setRows([]);
    setFileName("");
    setSuccessCount(null);
    setShowConfirmation(false);
    setMessage("No file selected");
    setAiFile(null);
    setAiNotes("");
    setAiMessage("Upload a PDF, Word doc, spreadsheet, text file, or clear record photo for AI review.");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (aiFileRef.current) aiFileRef.current.value = "";
  };

  const submitHelpRequest = async (event) => {
    event.preventDefault();
    try {
      setHelpSubmitting(true);
      await sendImportHelpRequest(helpForm);
      toast.success("Transfer help request sent.");
      setHelpForm({ recordFormat: "", transferPriority: "", notes: "", file: null });
      if (helpFileRef.current) helpFileRef.current.value = "";
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not send request.");
    } finally {
      setHelpSubmitting(false);
    }
  };

  const chooseHelpFile = () => {
    helpFileRef.current?.click();
    window.setTimeout(() => {
      document.getElementById("import-help-request")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  return (
    <div className="space-y-6 text-gray-100">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-md sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">Import Assistant</p>
            <h1 className="mt-2 text-3xl font-bold text-white">BarnBuddy Import Assistant</h1>
            <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base">
              Moving records should not stop you from getting started. Upload a spreadsheet, review your animals, and import records into BarnBuddy without starting from scratch.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-gray-700 bg-gray-950 p-2 text-center text-xs sm:min-w-80">
            {["Upload records", "Review AI draft", "Import animals"].map((step, index) => (
              <div key={step} className="rounded-lg bg-gray-800 px-2 py-3">
                <span className="block text-blue-300">Step {index + 1}</span>
                <strong className="mt-1 block text-gray-100">{step}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-xl font-semibold text-white">Start Fresh</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Do not want to transfer years of records? Add your current animals now and start keeping new records from today forward.
          </p>
          <button type="button" onClick={onAddCurrentAnimal} className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
            Add Current Animal
          </button>
        </div>

        <div className="rounded-2xl border border-blue-500/30 bg-gray-900 p-5">
          <h2 className="text-xl font-semibold text-white">Upload Spreadsheet</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Upload a CSV file with animal information and review everything before importing instantly.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
              Choose CSV File
            </button>
            <button type="button" onClick={handleTemplateDownload} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800">
              Download CSV Template
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          <p className="mt-3 text-xs text-gray-500">{fileName || message}</p>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="text-xl font-semibold text-white">Upload Records for AI Review</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Have notebook pages, photos, PDFs, spreadsheets, Word docs, notes, or another system export? Let AI draft animal rows for you to review.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => aiFileRef.current?.click()} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
              Upload Records
            </button>
            <button type="button" onClick={chooseHelpFile} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800">
              Request Help
            </button>
          </div>
          <input ref={aiFileRef} type="file" accept={AI_FILE_ACCEPT} className="hidden" onChange={(event) => handleAiFile(event.target.files?.[0])} />
          <p className="mt-3 text-xs text-gray-500">{aiMessage}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-500/30 bg-gray-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-white">AI Record Extraction</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              BarnBuddy can read many record files and draft animal rows. You stay in control: review, edit, remove, and confirm before anything is imported.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Google Docs shortcut files cannot be read directly. In Google Docs, choose File, Download, then PDF or Word (.docx).
            </p>
          </div>
          <div className="w-full space-y-3 lg:max-w-md">
            <label className="block text-sm font-semibold text-gray-300">
              Notes for AI
              <textarea
                rows="3"
                value={aiNotes}
                onChange={(event) => setAiNotes(event.target.value)}
                placeholder="Example: These are goat show records from 2023-2025. Tags may be listed as ear numbers."
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => aiFileRef.current?.click()} className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800">
                Choose Record File
              </button>
              <button
                type="button"
                onClick={handleAiExtract}
                disabled={!aiFile || isExtracting}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
              >
                {isExtracting ? "Extracting..." : "Extract With AI"}
              </button>
            </div>
            <p className="text-xs text-gray-500">{aiFile?.name || "No AI review file selected"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">CSV Format</h2>
            <p className="mt-2 text-sm text-gray-400">CSV imports are instant. AI-extracted files use the same preview table after BarnBuddy reads them.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-gray-800 p-3"><span className="text-gray-400">Total rows</span><strong className="block text-lg">{counts.total}</strong></div>
            <div className="rounded-lg bg-gray-800 p-3"><span className="text-gray-400">Ready to import</span><strong className="block text-lg">{counts.ready}</strong></div>
            <div className="rounded-lg bg-gray-800 p-3"><span className="text-gray-400">Rows with errors</span><strong className="block text-lg">{counts.errors}</strong></div>
            <div className="rounded-lg bg-gray-800 p-3"><span className="text-gray-400">Rows removed</span><strong className="block text-lg">{counts.removed}</strong></div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-800">
          <table className="min-w-full divide-y divide-gray-800 text-left text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                {TEMPLATE_HEADERS.split(",").map((header) => <th key={header} className="px-3 py-2">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr className="bg-gray-900 text-gray-300">
                {TEMPLATE_EXAMPLE.split(",").map((cell) => <td key={cell} className="px-3 py-2">{cell}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{successCount === null ? "Review your animals before importing" : "Import complete"}</h2>
            <p className="mt-1 text-sm text-gray-400">{isParsing ? "Parsing spreadsheet..." : message}</p>
          </div>
          <label className="inline-flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200">
            <input type="checkbox" checked={skipDuplicates} onChange={(event) => setSkipDuplicates(event.target.checked)} />
            Skip duplicates
          </label>
        </div>

        {successCount !== null ? (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-lg font-semibold text-emerald-100">{successCount} animals were imported successfully.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={onViewAnimals} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">View Animals</button>
              <button type="button" onClick={handleImportAnother} className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800">Import Another File</button>
            </div>
          </div>
        ) : validatedRows.length > 0 ? (
          <>
            <div className="mt-5 overflow-x-auto rounded-xl border border-gray-800">
              <table className="min-w-[1100px] divide-y divide-gray-800 text-left text-sm">
                <thead className="bg-gray-950 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    {FIELD_LABELS.map(([, label]) => <th key={label} className="px-3 py-2">{label}</th>)}
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {validatedRows.map((row) => {
                    const status = getStatus(row);
                    return (
                      <tr key={row.id} className={row.removed ? "bg-gray-950/60 opacity-60" : "bg-gray-900"}>
                        <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                        {FIELD_LABELS.map(([field]) => (
                          <td key={field} className="px-2 py-2">
                            <input
                              value={row.data[field] || ""}
                              disabled={row.removed}
                              onChange={(event) => updateRow(row.id, field, event.target.value)}
                              className="w-full rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5 text-gray-100 outline-none focus:border-blue-400 disabled:cursor-not-allowed"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                          {row.errors.length > 0 && <p className="mt-1 text-xs text-red-200">{row.errors.join(", ")}</p>}
                        </td>
                        <td className="px-3 py-2">
                          {row.removed ? (
                            <button type="button" onClick={() => restoreRow(row.id)} className="text-sm font-semibold text-blue-300 hover:text-blue-200">Restore</button>
                          ) : (
                            <button type="button" onClick={() => removeRow(row.id)} className="text-sm font-semibold text-red-300 hover:text-red-200">Remove</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {showConfirmation && (
              <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="font-semibold text-blue-100">You are about to import {counts.ready} animals into BarnBuddy.</p>
                <p className="mt-2 text-sm text-gray-300">
                  Ready rows: {counts.ready}. Skipped duplicates: {counts.skippedDuplicates}. Rows with errors that will not import: {counts.errors}.
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || counts.ready === 0 || counts.errors > 0}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showConfirmation ? (isImporting ? "Importing..." : "Import Animals") : "Continue to Import"}
              </button>
              {counts.errors > 0 && <p className="self-center text-sm text-red-200">Fix rows with errors before importing.</p>}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-gray-700 bg-gray-950 p-8 text-center text-gray-400">
            No file selected
          </div>
        )}
      </section>

      <section id="import-help-request" className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-xl font-semibold text-white">Request Transfer Help</h2>
        <p className="mt-2 text-sm text-gray-400">
          Upload paper-record photos, PDFs, spreadsheets, text notes, or documents if you want BarnBuddy to help manually. AI review above can draft rows first.
        </p>
        <form onSubmit={submitHelpRequest} className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="text-sm font-semibold text-gray-300">
            Current record format
            <select required value={helpForm.recordFormat} onChange={(event) => setHelpForm((current) => ({ ...current, recordFormat: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100">
              <option value="">Select format</option>
              {["Notebook / paper", "Spreadsheet", "Photos", "PDF", "Notes app", "Other software", "Not sure"].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-300">
            What animals do you want to transfer first
            <select required value={helpForm.transferPriority} onChange={(event) => setHelpForm((current) => ({ ...current, transferPriority: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100">
              <option value="">Select priority</option>
              {["Current animals only", "Show animals only", "Breeding stock only", "All animals", "Not sure"].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-gray-300 lg:col-span-2">
            Notes
            <textarea rows="4" value={helpForm.notes} onChange={(event) => setHelpForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Tell us what records you have and what you want moved into BarnBuddy." className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100" />
          </label>
          <label className="text-sm font-semibold text-gray-300">
            Optional file
            <input ref={helpFileRef} type="file" accept={HELP_FILE_ACCEPT} onChange={(event) => setHelpForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100" />
            <span className="mt-1 block text-xs text-gray-500">CSV, Excel, PDF, Word, TXT, JPG, PNG, WebP, HEIC up to 15MB.</span>
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={helpSubmitting} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70">
              {helpSubmitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

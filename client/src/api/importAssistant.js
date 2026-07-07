import api from "./axios";

export const importAnimals = (rows, options = {}) =>
  api.post("/import-assistant/import", {
    rows,
    skipDuplicates: options.skipDuplicates !== false,
  });

export const extractRecordsWithAi = (data) => {
  const formData = new FormData();
  formData.append("notes", data.notes || "");
  if (data.file) formData.append("file", data.file);

  return api.post("/import-assistant/extract", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const sendImportHelpRequest = (data) => {
  const formData = new FormData();
  formData.append("recordFormat", data.recordFormat || "");
  formData.append("transferPriority", data.transferPriority || "");
  formData.append("notes", data.notes || "");
  if (data.file) formData.append("file", data.file);

  return api.post("/import-assistant/request", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

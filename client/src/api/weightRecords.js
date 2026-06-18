import api from "./axios";

export const getWeightRecords = (animalId) =>
  api.get(`/animals/${animalId}/weight-records`);

export const createWeightRecord = (animalId, data) =>
  api.post(`/animals/${animalId}/weight-records`, data);

export const updateWeightRecord = (animalId, recordId, data) =>
  api.put(`/animals/${animalId}/weight-records/${recordId}`, data);

export const deleteWeightRecord = (animalId, recordId) =>
  api.delete(`/animals/${animalId}/weight-records/${recordId}`);

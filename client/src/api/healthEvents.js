import api from "./axios";

export const getHealthEvents = (animalId) =>
    api.get(`/healthEvents/animal/${animalId}`);

export const createHealthEvent = (data) =>
    api.post("/healthEvents", data);

export const createBulkHealthEvents = (data) =>
    api.post("/healthEvents/bulk", data);

export const updateHealthEvent = (id, data) =>
    api.put(`/healthEvents/${id}`, data);

export const deleteHealthEvent = (id) =>
    api.delete(`/healthEvents/${id}`);

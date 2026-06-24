import api from "./axios";

export const getFinanceRecords = (animalId) => api.get(`/premium-records/finance/animal/${animalId}`);
export const getHerdFinanceSummary = (herdId) => api.get(`/premium-records/finance/herd/${herdId}/summary`);
export const createFinanceRecord = (data) => api.post("/premium-records/finance", data);
export const updateFinanceRecord = (id, data) => api.put(`/premium-records/finance/${id}`, data);
export const deleteFinanceRecord = (id) => api.delete(`/premium-records/finance/${id}`);

export const getFeedRecords = (animalId) => api.get(`/premium-records/feed/animal/${animalId}`);
export const getHerdFeedRecords = (herdId) => api.get(`/premium-records/feed/herd/${herdId}`);
export const getUnassignedFeedRecords = () => api.get("/premium-records/feed/unassigned");
export const createFeedRecord = (data) => api.post("/premium-records/feed", data);
export const updateFeedRecord = (id, data) => api.put(`/premium-records/feed/${id}`, data);
export const deleteFeedRecord = (id) => api.delete(`/premium-records/feed/${id}`);

export const getHerdInventory = (herdId) => api.get(`/premium-records/inventory/herd/${herdId}`);
export const createInventoryItem = (data) => api.post("/premium-records/inventory", data);
export const updateInventoryItem = (id, data) => api.put(`/premium-records/inventory/${id}`, data);
export const deleteInventoryItem = (id) => api.delete(`/premium-records/inventory/${id}`);

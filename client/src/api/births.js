import api from "./axios";

export const getBirths = () => api.get("/births");
export const getAnimalBirths = (animalId) => api.get(`/births/animal/${animalId}`);
export const createBirth = (data) => api.post("/births", data);
export const updateBirth = (id, data) => api.put(`/births/${id}`, data);
export const deleteBirth = (id) => api.delete(`/births/${id}`);
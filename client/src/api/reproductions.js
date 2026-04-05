import api from "./axios";

export const getReproductions = () => api.get("/reproductions");
export const getAnimalReproductions = (animalId) => api.get(`/reproductions/animal/${animalId}`);
export const createReproduction = (data) => api.post("/reproductions", data);
export const updateReproduction = (id, data) => api.put(`/reproductions/${id}`, data);
export const deleteReproduction = (id) => api.delete(`/reproductions/${id}`);
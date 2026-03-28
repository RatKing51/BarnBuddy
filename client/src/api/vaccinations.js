import api from "./axios";

export const getVaccinations = (animalId) =>
    api.get(`/vaccinations/animal/${animalId}`);

export const createVaccination = (data) =>
    api.post("/vaccinations", data);

export const updateVaccination = (id, data) =>
    api.put(`/vaccinations/${id}`, data);

export const deleteVaccination = (id) =>
    api.delete(`/vaccinations/${id}`);

import api from "./axios";

export const updateBirthData = (animalId, data) =>
    api.put(`/animals/${animalId}/birth-data`, data);

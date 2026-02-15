import api from "./axios";

export const getAnimalsForUser = () => 
    api.get("/animals/");

export const getAnimalByID = (id) =>
    api.get(`/animals/${id}`);

export const createAnimal = (data) =>
    api.post("/animals/", data);

export const updateAnimal = (data, id) =>
    api.put(`/animals/${id}`, data);

export const deleteAnimal = (id) =>
    api.delete(`/animals/${id}`);

export const getAnimalsForHerd = (herdId) =>
    api.get(`/animals/herd/${herdId}`);

export const getAnimalsUnassigned = () =>
    api.get("/animals/unassigned");
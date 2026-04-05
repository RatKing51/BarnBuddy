import api from "./axios";

export const getVetVisitsForAnimal = (animalId) =>
    api.get(`/vetVisits/animal/${animalId}`);

export const getUpcomingVetVisitsForHerd = (herdId, days = 30) =>
    api.get(`/vetVisits/herd/${herdId}/upcoming?days=${days}`);

export const getUpcomingVetVisitsForUnassigned = (days = 30) =>
    api.get(`/vetVisits/unassigned/upcoming?days=${days}`);

export const getVetVisitById = (id) =>
    api.get(`/vetVisits/${id}`);

export const createVetVisit = (data) =>
    api.post("/vetVisits/", data);

export const updateVetVisit = (id, data) =>
    api.put(`/vetVisits/${id}`, data);

export const deleteVetVisit = (id) =>
    api.delete(`/vetVisits/${id}`);
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

export const getHerdCareSummary = (herdId, careWindowDays = 7) =>
    api.get(`/animals/herd/${herdId}/care-summary`, {
        params: { careWindowDays },
    });

export const getDashboardBootstrap = (careWindowDays = 7) =>
    api.get("/animals/dashboard/bootstrap", {
        params: { careWindowDays },
    });

export const getAnimalsUnassigned = () =>
    api.get("/animals/unassigned");

export const uploadAnimalImage = (id, file) => {
    const formData = new FormData();
    formData.append("image", file);

    return api.post(`/animals/${id}/upload`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};


export const removeAnimalImage = (id) =>
    api.delete(`/animals/${id}/upload`);

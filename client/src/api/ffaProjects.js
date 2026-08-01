import api from "./axios";

export const getFfaProjects = () => api.get("/ffa-projects");
export const getFfaProject = (projectId) => api.get(`/ffa-projects/${projectId}`);
export const createFfaProject = (data) => api.post("/ffa-projects", data);
export const updateFfaProject = (projectId, data) => api.patch(`/ffa-projects/${projectId}`, data);
export const deleteFfaProject = (projectId) => api.delete(`/ffa-projects/${projectId}`);

export const addFfaProjectAnimals = (projectId, animals) =>
  api.post(`/ffa-projects/${projectId}/animals`, { animals });
export const updateFfaProjectAnimal = (projectId, linkId, data) =>
  api.patch(`/ffa-projects/${projectId}/animals/${linkId}`, data);
export const removeFfaProjectAnimal = (projectId, linkId) =>
  api.delete(`/ffa-projects/${projectId}/animals/${linkId}`);

export const addFfaProjectActivity = (projectId, data) =>
  api.post(`/ffa-projects/${projectId}/activities`, data);
export const updateFfaProjectActivity = (projectId, activityId, data) =>
  api.put(`/ffa-projects/${projectId}/activities/${activityId}`, data);
export const deleteFfaProjectActivity = (projectId, activityId) =>
  api.delete(`/ffa-projects/${projectId}/activities/${activityId}`);

export const addFfaProjectFinance = (projectId, data) =>
  api.post(`/ffa-projects/${projectId}/finances`, data);
export const updateFfaProjectFinance = (projectId, financeId, data) =>
  api.put(`/ffa-projects/${projectId}/finances/${financeId}`, data);
export const deleteFfaProjectFinance = (projectId, financeId) =>
  api.delete(`/ffa-projects/${projectId}/finances/${financeId}`);

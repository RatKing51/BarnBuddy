import api from "./axios";


export const getHerdsForUser = () =>
  api.get("/herds/");

export const createHerd = (data) =>
  api.post("/herds/", data);

export const updateHerd = (id, data) =>
  api.put(`/herds/${id}`, data);

export const deleteHerd = (id) =>
  api.delete(`/herds/${id}`);

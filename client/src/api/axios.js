import axios from "axios";
import { API_BASE_URL } from "../config/env";

let authTokenGetter = null;

export function setAuthTokenGetter(getToken) {
    authTokenGetter = getToken;
}

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use(
    async (config) => {
        let token = authTokenGetter ? await authTokenGetter() : null;
        if (!token && authTokenGetter) {
            token = await authTokenGetter({ skipCache: true });
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
)

export default api;

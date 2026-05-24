import axios from "axios";

let authTokenGetter = null;

export function setAuthTokenGetter(getToken) {
    authTokenGetter = getToken;
}

const api = axios.create({
    baseURL: "http://localhost:5000/api",
});

api.interceptors.request.use(
    async (config) => {
        const token = authTokenGetter ? await authTokenGetter() : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
)

export default api;

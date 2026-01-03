import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user on refresh
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            return;
        }

        fetch("http://localhost:5000/auth/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setUser(data.user);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        setLoading(true);

        const res = await fetch("http://localhost:5000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            setLoading(false);
            throw new Error(data.error || "Login failed");
        }

        localStorage.setItem("token", data.token);
        setUser(data.user);
        setLoading(false);
    }

    async function register(name, email, password) {
        setLoading(true);

        const res = await fetch("http://localhost:5000/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            setLoading(false);
            throw new Error(data.error || "Register failed");
        }

        // auto-login after signup
        await login(email, password);
    }

    function logout() {
        localStorage.removeItem("token");
        setUser(null);
    }

    function authFetch(url, options = {}) {
        const token = localStorage.getItem("token");

        return fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });
    }

    return (
        <AuthContext.Provider
            value={{ user, login, register, logout, loading, authFetch }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

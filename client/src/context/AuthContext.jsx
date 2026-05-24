import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
    const { user: clerkUser } = useUser();

    useEffect(() => {
        setAuthTokenGetter(getToken);
    }, [getToken]);

    const logout = useCallback(async function logout() {
        await signOut();
    }, [signOut]);

    const authFetch = useCallback(async function authFetch(url, options = {}) {
        const token = await getToken();
        const headers = new Headers(options.headers || {});

        if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        return fetch(url, {
            ...options,
            headers,
        });
    }, [getToken]);

    const deleteAccount = useCallback(async function deleteAccount() {
        const res = await authFetch("http://localhost:5000/auth/me", {
            method: "DELETE",
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Failed to delete account");
        }

        await signOut();
    }, [authFetch, signOut]);

    const user = isSignedIn ? clerkUser : null;
    const loading = !isLoaded;
    const value = useMemo(
        () => ({ user, logout, deleteAccount, loading, authFetch }),
        [user, logout, deleteAccount, loading, authFetch]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

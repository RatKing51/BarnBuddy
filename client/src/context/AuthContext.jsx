import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "../api/axios";
import { API_URL, CLERK_PREMIUM_FEATURE_SLUG, CLERK_PREMIUM_PLAN_ID, CLERK_PREMIUM_PLAN_SLUG } from "../config/env";
import { getSubscriptionFromClerk } from "../config/subscription";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const { isLoaded, isSignedIn, getToken, signOut, sessionClaims, has } = useClerkAuth();
    const { user: clerkUser } = useUser();
    const [backendUser, setBackendUser] = useState(null);
    const [backendPreferences, setBackendPreferences] = useState(null);
    const [backendAuthLoading, setBackendAuthLoading] = useState(true);
    const [backendAuthError, setBackendAuthError] = useState(null);

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

    useEffect(() => {
        let cancelled = false;

        async function syncBackendUser() {
            if (!isLoaded) return;

            if (!isSignedIn) {
                setBackendUser(null);
                setBackendPreferences(null);
                setBackendAuthError(null);
                setBackendAuthLoading(false);
                return;
            }

            try {
                setBackendAuthLoading(true);
                setBackendAuthError(null);

                const res = await authFetch(`${API_URL}/auth/me`);
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    throw new Error(data.error || data.message || "Failed to sync account");
                }

                if (!cancelled) {
                    setBackendUser(data.user || null);
                    setBackendPreferences(data.preferences || null);
                }
            } catch (err) {
                console.error("Backend account sync failed:", err);
                if (!cancelled) {
                    setBackendUser(null);
                    setBackendPreferences(null);
                    setBackendAuthError(err);
                }
            } finally {
                if (!cancelled) {
                    setBackendAuthLoading(false);
                }
            }
        }

        syncBackendUser();

        return () => {
            cancelled = true;
        };
    }, [authFetch, isLoaded, isSignedIn]);

    const deleteAccount = useCallback(async function deleteAccount() {
        const res = await authFetch(`${API_URL}/auth/me`, {
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
    const hasPremiumAccess = useMemo(() => {
        if (!isLoaded || !isSignedIn || typeof has !== "function") return false;

        const planCandidates = [CLERK_PREMIUM_PLAN_SLUG, CLERK_PREMIUM_PLAN_ID, "premium", "pro"].filter(Boolean);
        const featureCandidates = [CLERK_PREMIUM_FEATURE_SLUG, "premium_access"].filter(Boolean);
        const hasAccess = (kind, value) => {
            try {
                return has({ [kind]: value });
            } catch (err) {
                console.warn("Clerk access check failed:", { kind, value, error: err.message });
                return false;
            }
        };

        return Boolean(
            planCandidates.some((plan) => hasAccess("plan", plan)) ||
            featureCandidates.some((feature) => hasAccess("feature", feature))
        );
    }, [has, isLoaded, isSignedIn]);

    const subscription = useMemo(
        () => getSubscriptionFromClerk({
            user: clerkUser,
            sessionClaims,
            backendUser,
            hasPremiumAccess,
        }),
        [backendUser, clerkUser, hasPremiumAccess, sessionClaims]
    );

    const value = useMemo(
        () => ({
            user,
            backendUser,
            backendPreferences,
            backendAuthLoading,
            backendAuthError,
            subscription,
            logout,
            deleteAccount,
            loading,
            authFetch,
        }),
        [
            user,
            backendUser,
            backendPreferences,
            backendAuthLoading,
            backendAuthError,
            subscription,
            logout,
            deleteAccount,
            loading,
            authFetch,
        ]
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

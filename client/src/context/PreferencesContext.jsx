import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { API_URL } from "../config/env";

const preferenceDefaults = {
  careWindow: "7",
  dashboardDensity: "comfortable",
  appTheme: "dark",
  animalPrimaryIdentifier: "name",
  emailUpdates: true,
  automaticReminders: false,
};

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const { user, loading, backendAuthLoading, authFetch } = useAuth();
  const [preferences, setPreferences] = useState(preferenceDefaults);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("bb-light", preferences.appTheme === "light");
    document.documentElement.classList.toggle("bb-dark", preferences.appTheme !== "light");
    document.documentElement.classList.toggle("bb-compact", preferences.dashboardDensity === "compact");
  }, [preferences.appTheme, preferences.dashboardDensity]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      if (loading || backendAuthLoading) return;

      if (!user) {
        setPreferences(preferenceDefaults);
        setLoadingPreferences(false);
        return;
      }

      try {
        setLoadingPreferences(true);
        const res = await authFetch(`${API_URL}/auth/preferences`);
        if (!res.ok) throw new Error("Failed to load preferences");
        const data = await res.json();
        if (!cancelled) {
          setPreferences({ ...preferenceDefaults, ...data });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setPreferences(preferenceDefaults);
      } finally {
        if (!cancelled) setLoadingPreferences(false);
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [authFetch, backendAuthLoading, loading, user]);

  const updatePreference = useCallback(async (field, value) => {
    const nextPreferences = { ...preferences, [field]: value };
    setPreferences(nextPreferences);

    try {
      setSavingPreferences(true);
      const res = await authFetch(`${API_URL}/auth/preferences`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) throw new Error("Failed to save preferences");
      const saved = await res.json();
      setPreferences({ ...preferenceDefaults, ...saved });
      return { ok: true };
    } catch (err) {
      console.error(err);
      setPreferences(preferences);
      return { ok: false, error: err };
    } finally {
      setSavingPreferences(false);
    }
  }, [authFetch, preferences]);

  const value = useMemo(
    () => ({
      preferences,
      preferenceDefaults,
      loadingPreferences,
      savingPreferences,
      updatePreference,
    }),
    [loadingPreferences, preferences, savingPreferences, updatePreference]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences() {
  return useContext(PreferencesContext);
}

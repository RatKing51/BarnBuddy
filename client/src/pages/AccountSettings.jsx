import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { API_BASE_URL } from "../config/env";

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { logout, deleteAccount, authFetch } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [loadingNewsletter, setLoadingNewsletter] = useState(true);
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const { preferences, loadingPreferences, savingPreferences, updatePreference } = usePreferences();

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadNewsletterStatus() {
      if (!user) return;

      try {
        setLoadingNewsletter(true);
        const res = await authFetch(`${API_BASE_URL}/newsletter/me`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Failed to load newsletter status.");
        }

        if (!cancelled) {
          setNewsletterSubscribed(Boolean(data.subscribed));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setNewsletterSubscribed(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingNewsletter(false);
        }
      }
    }

    loadNewsletterStatus();

    return () => {
      cancelled = true;
    };
  }, [authFetch, user]);

  const handlePreferenceChange = async (field, value) => {
    const result = await updatePreference(field, value);
    if (result.ok) {
      toast.success("Preference saved.");
    } else {
      toast.error("Failed to save preference.");
    }
  };

  const handleNewsletterChange = async (subscribed) => {
    try {
      setSavingNewsletter(true);
      const res = await authFetch(`${API_BASE_URL}/newsletter/me`, {
        method: "PATCH",
        body: JSON.stringify({ subscribed }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to update newsletter setting.");
      }

      setNewsletterSubscribed(Boolean(data.subscribed));
      toast.success(data.subscribed ? "Product updates enabled." : "Product updates disabled.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update newsletter setting.");
    } finally {
      setSavingNewsletter(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    try {
      setSavingProfile(true);
      await user.update({ firstName, lastName });
      toast.success("Profile updated.");
    } catch (err) {
      console.error(err);
      toast.error(err.errors?.[0]?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/");
      toast.success("Logged out.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your BarnBuddy account and all farm records? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingAccount(true);
      await deleteAccount();
      navigate("/");
      toast.success("Account deleted.");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="text-left text-2xl font-bold tracking-tight hover:opacity-85"
            >
              <span className="text-blue-500">Barn</span>Buddy
            </button>
            <p className="mt-1 text-sm text-gray-400">Account settings</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl bg-gray-700 px-4 py-2 font-semibold text-white hover:bg-gray-600"
            >
              Dashboard
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Manage your BarnBuddy account</h1>
          <p className="mt-3 text-gray-400">
            Update profile basics, adjust app preferences, manage herds, or handle account-level actions from one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(260px,340px)_1fr]">
          <aside className="space-y-4">
            <button
              onClick={() => navigate("/settings/herd")}
              className="w-full rounded-2xl border border-gray-700 bg-gray-800 p-5 text-left transition hover:border-blue-400 hover:bg-gray-700"
            >
              <p className="font-semibold text-white">Herd settings</p>
              <p className="mt-2 text-sm text-gray-400">Create, rename, or delete herds.</p>
            </button>

            <button
              onClick={handleLogout}
              disabled={loggingOut || deletingAccount}
              className="w-full rounded-2xl border border-gray-700 bg-gray-800 p-5 text-left transition hover:border-blue-400 hover:bg-gray-700 disabled:cursor-wait disabled:opacity-70"
            >
              <p className="font-semibold text-white">{loggingOut ? "Logging out..." : "Log out"}</p>
              <p className="mt-2 text-sm text-gray-400">End this session and return to the public site.</p>
            </button>
          </aside>

          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white">Profile</h2>
              <p className="mt-2 text-sm text-gray-400">These basics come from your Clerk account.</p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-gray-400">First name</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    onBlur={saveProfile}
                    className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-white outline-none focus:border-blue-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-400">Last name</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={saveProfile}
                    className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-white outline-none focus:border-blue-400"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <p className="text-sm text-gray-400">{user?.primaryEmailAddress?.emailAddress || "No email loaded"}</p>
                </div>
                <span className="rounded-full bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">
                  {savingProfile ? "Saving..." : "Auto-saves"}
                </span>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
              <h2 className="text-xl font-semibold text-white">Preferences</h2>
              <p className="mt-2 text-sm text-gray-400">
                Saved app preferences for this BarnBuddy account.
                {loadingPreferences && " Loading preferences..."}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-gray-400">Care due soon window</span>
                  <select
                    value={preferences.careWindow}
                    onChange={(e) => handlePreferenceChange("careWindow", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-white outline-none focus:border-blue-400"
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-400">Dashboard density</span>
                  <select
                    value={preferences.dashboardDensity}
                    onChange={(e) => handlePreferenceChange("dashboardDensity", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-white outline-none focus:border-blue-400"
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-400">Theme</span>
                  <select
                    value={preferences.appTheme}
                    onChange={(e) => handlePreferenceChange("appTheme", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-white outline-none focus:border-blue-400"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-400">Primary animal label</span>
                  <select
                    value={preferences.animalPrimaryIdentifier}
                    onChange={(e) => handlePreferenceChange("animalPrimaryIdentifier", e.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-white outline-none focus:border-blue-400"
                  >
                    <option value="name">Animal name</option>
                    <option value="tag">Tag ID</option>
                  </select>
                </label>
              </div>

              <label className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">Product updates</p>
                  <p className="text-sm text-gray-400">
                    {loadingNewsletter
                      ? "Checking newsletter status..."
                      : newsletterSubscribed
                      ? "Your email is subscribed to BarnBuddy updates."
                      : "Your email is not subscribed to BarnBuddy updates."}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={newsletterSubscribed}
                  disabled={loadingNewsletter || savingNewsletter}
                  onChange={(e) => handleNewsletterChange(e.target.checked)}
                  className="h-5 w-5 accent-blue-600"
                />
              </label>

              {(savingPreferences || savingNewsletter) && (
                <p className="mt-3 text-sm text-blue-300">
                  {savingNewsletter ? "Saving newsletter setting..." : "Saving preference..."}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
              <h2 className="text-xl font-semibold text-white">Danger zone</h2>
              <p className="mt-2 text-sm leading-relaxed text-red-100/80">
                Deleting your account removes your BarnBuddy user record and farm data. This action cannot be undone.
              </p>

              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || loggingOut}
                className="mt-5 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-70"
              >
                {deletingAccount ? "Deleting account..." : "Delete account"}
              </button>
            </section>
          </div>
        </div>
      </main>

      <ToastContainer autoClose="1000" />
    </div>
  );
}

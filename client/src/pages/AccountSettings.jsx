import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";
import { toast, ToastContainer } from "react-toastify";
import BillingAction from "../components/BillingAction";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { API_BASE_URL, API_URL } from "../config/env";
import { PREMIUM_FEATURES, PLANS, PLAN_IDS } from "../config/subscription";

function reminderBadgeClass(urgency) {
  if (urgency === "critical" || urgency === "overdue") {
    return "bg-red-500/15 text-red-200 ring-1 ring-red-400/30";
  }

  if (urgency === "today") {
    return "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/30";
  }

  if (urgency === "soon") {
    return "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/30";
  }

  return "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30";
}

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { logout, deleteAccount, authFetch, refreshBackendUser, subscription } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [loadingNewsletter, setLoadingNewsletter] = useState(true);
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const [reminderItems, setReminderItems] = useState([]);
  const [reminderWindow, setReminderWindow] = useState(null);
  const [reminderEmailEnabled, setReminderEmailEnabled] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [sendingReminderEmail, setSendingReminderEmail] = useState(false);
  const [restartingOnboarding, setRestartingOnboarding] = useState(false);
  const { preferences, loadingPreferences, savingPreferences, updatePreference } = usePreferences();
  const [profileSaveStatus, setProfileSaveStatus] = useState("idle");
  const lastProfileSignature = useRef("");
  const profileSaveStatusTimer = useRef(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    lastProfileSignature.current = JSON.stringify({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    });
  }, [user]);

  useEffect(() => () => {
    if (profileSaveStatusTimer.current) clearTimeout(profileSaveStatusTimer.current);
  }, []);

  const markProfileSaved = () => {
    setProfileSaveStatus("saved");
    if (profileSaveStatusTimer.current) clearTimeout(profileSaveStatusTimer.current);
    profileSaveStatusTimer.current = setTimeout(() => setProfileSaveStatus("idle"), 1600);
  };

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

  const loadReminderPreview = async () => {
    if (!user || !subscription.isPremium) return;

    try {
      setLoadingReminders(true);
      const res = await authFetch(`${API_BASE_URL}/notifications/reminders/preview`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to load reminders.");
      }

      setReminderItems(Array.isArray(data.items) ? data.items : []);
      setReminderWindow(data.windowDays || null);
      setReminderEmailEnabled(data.emailEnabled !== false);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load reminders.");
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    if (!subscription.isPremium) {
      setReminderItems([]);
      setReminderWindow(null);
      setReminderEmailEnabled(true);
      return;
    }

    loadReminderPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription.isPremium, user?.id, preferences.careWindow]);

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

  const sendReminderEmail = async () => {
    try {
      setSendingReminderEmail(true);
      const res = await authFetch(`${API_BASE_URL}/notifications/reminders/send`, {
        method: "POST",
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Failed to send reminder email.");
      }

      setReminderItems(Array.isArray(data.items) ? data.items : []);
      setReminderWindow(data.windowDays || reminderWindow);
      setReminderEmailEnabled(data.emailEnabled !== false);

      if (data.sent) {
        toast.success("Reminder email sent.");
      } else {
        toast.info(data.reason || "No reminders to send right now.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to send reminder email.");
    } finally {
      setSendingReminderEmail(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    const signature = JSON.stringify({ firstName, lastName });
    if (signature === lastProfileSignature.current) return;

    try {
      setSavingProfile(true);
      setProfileSaveStatus("saving");
      await user.update({ firstName, lastName });
      lastProfileSignature.current = signature;
      markProfileSaved();
    } catch (err) {
      setProfileSaveStatus("idle");
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

  const restartOnboarding = async () => {
    try {
      setRestartingOnboarding(true);
      const res = await authFetch(`${API_URL}/auth/onboarding/restart`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to restart onboarding.");
      }

      await refreshBackendUser();
      toast.success("Onboarding restarted.");
      navigate("/dashboard/onboarding");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to restart onboarding.");
    } finally {
      setRestartingOnboarding(false);
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
              onClick={() => navigate("/settings/import-assistant")}
              className="w-full rounded-2xl border border-blue-400/30 bg-blue-500/10 p-5 text-left transition hover:border-blue-300 hover:bg-blue-500/15"
            >
              <p className="font-semibold text-white">Import Assistant</p>
              <p className="mt-2 text-sm text-blue-100/80">
                Upload CSVs, photos, PDFs, paper records, and other files for animal record transfer.
              </p>
            </button>

            <button
              onClick={restartOnboarding}
              disabled={restartingOnboarding}
              className="w-full rounded-2xl border border-gray-700 bg-gray-800 p-5 text-left transition hover:border-blue-400 hover:bg-gray-700 disabled:cursor-wait disabled:opacity-70"
            >
              <p className="font-semibold text-white">{restartingOnboarding ? "Starting onboarding..." : "Restart onboarding"}</p>
              <p className="mt-2 text-sm text-gray-400">Run the BarnBuddy setup questions again and update your dashboard shortcuts.</p>
            </button>

            <button
              onClick={() => navigate("/pricing")}
              className={`w-full rounded-2xl border p-5 text-left transition ${
                subscription.isPremium
                  ? "border-gray-700 bg-gray-800 hover:border-blue-400 hover:bg-gray-700"
                  : "border-blue-400/30 bg-blue-500/10 hover:border-blue-300 hover:bg-blue-500/15"
              }`}
            >
              <p className="font-semibold text-white">Subscription</p>
              <p className={`mt-2 text-sm ${subscription.isPremium ? "text-gray-400" : "text-blue-100/80"}`}>
                {subscription.isPremium ? "Manage billing and plan details." : "Review Premium tools and pricing."}
              </p>
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
            <section className={`rounded-2xl border p-6 ${
              subscription.isPremium
                ? "border-gray-700 bg-gray-800"
                : "border-blue-400/30 bg-blue-500/10"
            }`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${subscription.isPremium ? "text-gray-500" : "text-blue-300"}`}>Billing</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Subscription</h2>
                  <p className={`mt-2 text-sm ${subscription.isPremium ? "text-gray-400" : "text-blue-100/80"}`}>
                    BarnBuddy uses Clerk Billing for upgrades and subscription management.
                  </p>
                </div>
                {!subscription.isPremium && (
                  <span className="w-fit rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                    {subscription.planName} - {subscription.statusLabel}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <p className="font-semibold text-white">{PLANS[subscription.planId].name} plan</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {subscription.isPremium
                      ? "Your account has access to dashboard, export, reminder, and planning tools."
                      : `${PLANS[PLAN_IDS.premium].price}/${PLANS[PLAN_IDS.premium].interval.replace("per ", "")} unlocks the Premium toolset.`}
                  </p>
                </div>
                <BillingAction
                  isPremium={subscription.isPremium}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                  signedOutClassName="bg-blue-600 text-white hover:bg-blue-500"
                />
              </div>

              {!subscription.isPremium && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PREMIUM_FEATURES.map((feature) => (
                    <div key={feature} className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-200">
                      <span className="mr-2 text-blue-300">Premium</span>
                      {feature}
                    </div>
                  ))}
                </div>
              )}
            </section>

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
                  {savingProfile || profileSaveStatus === "saving" ? "Saving..." : profileSaveStatus === "saved" ? "Saved" : "Auto-saves"}
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
                  <p className="font-semibold text-white">Automatic reminders</p>
                  <p className="text-sm text-gray-400">
                    {subscription.isPremium
                      ? "Email due and overdue care reminders from vaccines, vet visits, reproduction, and feed records."
                      : "Premium accounts can enable email reminders."}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={subscription.isPremium && Boolean(preferences.automaticReminders)}
                  disabled={!subscription.isPremium || savingPreferences}
                  onChange={(e) => handlePreferenceChange("automaticReminders", e.target.checked)}
                  className="h-5 w-5 accent-blue-600 disabled:opacity-50"
                />
              </label>

              {subscription.isPremium && (
                <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">Reminder email preview</p>
                      <p className="text-sm text-gray-400">
                        {!reminderEmailEnabled
                          ? "Email sending is disabled on the server. Turn on EMAIL_ENABLED and set RESEND_API_KEY."
                          : loadingReminders
                          ? "Checking upcoming reminders..."
                          : reminderItems.length > 0
                          ? `${reminderItems.length} reminder${reminderItems.length === 1 ? "" : "s"} inside your ${reminderWindow || preferences.careWindow}-day window.`
                          : `No reminders due inside your ${reminderWindow || preferences.careWindow}-day window.`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={loadReminderPreview}
                        disabled={loadingReminders || sendingReminderEmail}
                        className="rounded-lg border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-100 hover:border-blue-400 disabled:cursor-wait disabled:opacity-60"
                      >
                        {loadingReminders ? "Refreshing..." : "Refresh"}
                      </button>
                      <button
                        type="button"
                        onClick={sendReminderEmail}
                        disabled={loadingReminders || sendingReminderEmail}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
                      >
                        {sendingReminderEmail ? "Sending..." : "Send email"}
                      </button>
                    </div>
                  </div>

                  {reminderItems.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {reminderItems.slice(0, 5).map((item) => (
                        <div
                          key={item.key}
                          className="flex flex-col gap-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-white">
                              {item.type}: {item.subject}
                            </p>
                            <p className="text-gray-400">{item.title}</p>
                          </div>
                          <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${reminderBadgeClass(item.urgency)}`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                      {reminderItems.length > 5 && (
                        <p className="text-xs text-gray-500">And {reminderItems.length - 5} more in the email.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
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

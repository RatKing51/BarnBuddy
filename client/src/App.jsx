import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Pricing from "./pages/Pricing";
import About from "./pages/AboutUs";
import PrivateRoute from "./routes/PrivateRoute";
import HerdSettings from "./pages/HerdSettings";
import AccountSettings from "./pages/AccountSettings";
import SettingsImportAssistant from "./pages/SettingsImportAssistant";
import TOSandPP from "./pages/TOSandPP";
import News from "./pages/News";
import Contact from "./pages/Contact";
import HelpCenter from "./pages/HelpCenter";
import Status from "./pages/Status";
import AdminContent from "./pages/AdminContent";
import { ToastContainer } from "react-toastify";
import { PageLoadingBar } from "./components/LoadingSpinner";
import { getSiteContent } from "./api/siteContent";
import { defaultSiteContent } from "./data/siteContent";
import { useAuth } from "./context/AuthContext";
import { ADMIN_CLERK_USER_IDS, ADMIN_EMAILS } from "./config/env";

const DOCS_URL = "https://doc.barnbuddy.pro";
const ANNOUNCEMENT_EVENT = "barnbuddy:announcement-updated";
const MAINTENANCE_EVENT = "barnbuddy:maintenance-updated";
const announcementStyles = {
  blue: {
    shell: "border-sky-300/20 bg-[#0f2650]",
    label: "text-sky-200",
    button: "bg-sky-400 text-[#07111f] hover:bg-sky-300",
  },
  green: {
    shell: "border-emerald-300/20 bg-[#123326]",
    label: "text-emerald-200",
    button: "bg-emerald-300 text-[#07111f] hover:bg-emerald-200",
  },
  yellow: {
    shell: "border-amber-300/25 bg-[#3b2d0a]",
    label: "text-amber-200",
    button: "bg-amber-300 text-[#171001] hover:bg-amber-200",
  },
  red: {
    shell: "border-red-300/25 bg-[#3b1218]",
    label: "text-red-100",
    button: "bg-red-200 text-[#2a0509] hover:bg-red-100",
  },
};

function DocsRedirect() {
  useEffect(() => {
    window.location.replace(DOCS_URL);
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b1730] px-4 text-center text-white">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">BarnBuddy Docs</p>
        <h1 className="mt-3 text-3xl font-semibold">Opening documentation...</h1>
        <p className="mt-3 text-white/70">
          If you are not redirected, <a className="text-blue-300 underline" href={DOCS_URL}>open the docs</a>.
        </p>
      </div>
    </main>
  );
}

function AppContent() {
  const location = useLocation();
  const { user, subscription } = useAuth();
  const [pageLoading, setPageLoading] = useState(false);
  const [announcement, setAnnouncement] = useState(defaultSiteContent.announcement);
  const [maintenance, setMaintenance] = useState(defaultSiteContent.maintenance);
  const hiddenPaths = ["/dashboard", "/admin", "/settings/herd", "/settings/account", "/settings/import-assistant"];
  const showShell = !hiddenPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const maintenanceAllowedPaths = ["/admin", "/login"];
  const showMaintenance = Boolean(
    maintenance?.enabled &&
      !maintenanceAllowedPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))
  );
  const primaryEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const isAdmin = Boolean(
    user &&
      ((primaryEmail && ADMIN_EMAILS.includes(primaryEmail)) ||
        (user?.id && ADMIN_CLERK_USER_IDS.includes(user.id)))
  );
  const announcementAudience = announcement?.targetAudience || "all";
  const announcementMatchesAudience =
    announcementAudience === "all" ||
    (announcementAudience === "free" && !subscription?.isPremium && !isAdmin) ||
    (announcementAudience === "premium" && subscription?.isPremium) ||
    (announcementAudience === "admins" && isAdmin);
  const showAnnouncement = showShell && announcement?.enabled && announcementMatchesAudience && (announcement.title || announcement.message);
  const announcementStyle = announcementStyles[announcement?.tone] || announcementStyles.blue;

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncement() {
      try {
        const content = await getSiteContent();
        if (!cancelled && content.announcement) {
          setAnnouncement({ ...defaultSiteContent.announcement, ...content.announcement });
        }
        if (!cancelled && content.maintenance) {
          setMaintenance({ ...defaultSiteContent.maintenance, ...content.maintenance });
        }
      } catch (err) {
        console.warn("Using bundled announcement content:", err.message);
      }
    }

    loadAnnouncement();

    function handleAnnouncementUpdate(event) {
      setAnnouncement({ ...defaultSiteContent.announcement, ...(event.detail || {}) });
    }

    function handleMaintenanceUpdate(event) {
      setMaintenance({ ...defaultSiteContent.maintenance, ...(event.detail || {}) });
    }

    function handleStorage(event) {
      if (![ANNOUNCEMENT_EVENT, MAINTENANCE_EVENT].includes(event.key) || !event.newValue) return;
      try {
        const value = JSON.parse(event.newValue);
        if (event.key === ANNOUNCEMENT_EVENT) {
          setAnnouncement({ ...defaultSiteContent.announcement, ...value });
        } else {
          setMaintenance({ ...defaultSiteContent.maintenance, ...value });
        }
      } catch (err) {
        console.warn("Failed to read site content update:", err.message);
      }
    }

    window.addEventListener(ANNOUNCEMENT_EVENT, handleAnnouncementUpdate);
    window.addEventListener(MAINTENANCE_EVENT, handleMaintenanceUpdate);
    window.addEventListener("storage", handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(ANNOUNCEMENT_EVENT, handleAnnouncementUpdate);
      window.removeEventListener(MAINTENANCE_EVENT, handleMaintenanceUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/login") || location.pathname.startsWith("/signup")) {
      setPageLoading(false);
      return undefined;
    }

    setPageLoading(true);
    const timer = window.setTimeout(() => setPageLoading(false), 250);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <PageLoadingBar active={pageLoading} />
      <ToastContainer autoClose={1000} />
      {showMaintenance ? (
        <main className="grid min-h-screen place-items-center bg-[#07111f] px-4 text-center text-white">
          <section className="w-full max-w-3xl rounded-lg border border-sky-300/20 bg-[#0f2650] p-8 shadow-2xl shadow-black/30 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">Maintenance Mode</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              {maintenance.title || defaultSiteContent.maintenance.title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/78">
              {maintenance.message || defaultSiteContent.maintenance.message}
            </p>
            {maintenance.estimatedReturn && (
              <p className="mt-6 rounded-md border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-sky-100">
                Expected back: {maintenance.estimatedReturn}
              </p>
            )}
          </section>
        </main>
      ) : (
      <>
      {showShell && <Navbar />}
      {showAnnouncement && (
        <section className={`border-b px-4 py-5 text-white shadow-lg shadow-black/15 ${announcementStyle.shell}`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-4xl">
              {announcement.title && (
                <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${announcementStyle.label}`}>
                  {announcement.title}
                </p>
              )}
              <p className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">
                {announcement.message}
              </p>
            </div>
            {announcement.linkText && announcement.linkUrl && (
              <a className={`inline-flex w-fit items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition ${announcementStyle.button}`} href={announcement.linkUrl}>
                {announcement.linkText}
              </a>
            )}
          </div>
        </section>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/*" element={<Login />} />
        <Route path="/signup/*" element={<SignUp />} />
        <Route path="/aboutus" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/termsofserviceandprivacypolicy" element={<TOSandPP />} />
        <Route path="/news" element={<News />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/status" element={<Status />} />
        <Route path="/docs" element={<DocsRedirect />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/animal/:animalId" element={<Dashboard />} />
          <Route path="/admin" element={<AdminContent />} />
          <Route path="/settings/account" element={<AccountSettings />} />
          <Route path="/settings/import-assistant" element={<SettingsImportAssistant />} />
          <Route path="/settings/herd" element={<HerdSettings />} />
        </Route>
      </Routes>
      </>
      )}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

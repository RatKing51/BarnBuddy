import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import About from "./pages/AboutUs";
import PrivateRoute from "./routes/PrivateRoute";
import HerdSettings from "./pages/HerdSettings";
import AccountSettings from "./pages/AccountSettings";
import TOSandPP from "./pages/TOSandPP";
import News from "./pages/News";
import Contact from "./pages/Contact";
import HelpCenter from "./pages/HelpCenter";
import Status from "./pages/Status";
import AdminContent from "./pages/AdminContent";
import { ToastContainer } from "react-toastify";
import { PageLoadingBar } from "./components/LoadingSpinner";

const DOCS_URL = "https://doc.barnbuddy.pro";

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
  const [pageLoading, setPageLoading] = useState(false);
  const hiddenPaths = ["/dashboard", "/settings/herd", "/settings/account"];
  const showShell = !hiddenPaths.includes(location.pathname);

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
      {showShell && <Navbar />}
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminContent />} />
          <Route path="/settings/account" element={<AccountSettings />} />
          <Route path="/settings/herd" element={<HerdSettings />} />
        </Route>
      </Routes>
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

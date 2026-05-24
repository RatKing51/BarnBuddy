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
import TOSandPP from "./pages/TOSandPP";
import { ToastContainer } from "react-toastify";
import { PageLoadingBar } from "./components/LoadingSpinner";

function AppContent() {
  const location = useLocation();
  const [pageLoading, setPageLoading] = useState(false);
  const hiddenPaths = ["/dashboard", "/settings/herd"];
  const showShell = !hiddenPaths.includes(location.pathname);

  useEffect(() => {
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

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
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

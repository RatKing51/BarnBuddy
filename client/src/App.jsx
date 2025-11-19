import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import AboutUs from "./pages/AboutUs";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";

function AppContent() {
  const location = useLocation();
  const hiddenPaths = ["/dashboard"];
  const showShell = !hiddenPaths.includes(location.pathname);

  return (
    <>
      {showShell && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/aboutus" element={<AboutUs />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/dashboard" element={<Dashboard />} />
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
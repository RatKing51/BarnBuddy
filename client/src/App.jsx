import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import Login from "./pages/Login"
import SignUp from "./pages/SignUp";
import AboutUs from "./pages/AboutUs";
import Pricing from "./pages/Pricing";
import Footer from "./components/Footer";

function App() {
  return (
    <>
      <Navbar />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;

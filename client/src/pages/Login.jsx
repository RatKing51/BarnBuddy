import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-[#0f2650] border border-white/6 rounded-xl p-8 shadow-lg">
            <h1 className="text-2xl font-semibold mb-6">LOGIN</h1>

            {error && (
              <div className="text-red-400 text-sm mb-3">{error}</div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="flex flex-col text-sm">
                <span className="mb-2 text-white/80">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-2 rounded-md bg-white/5 text-white border border-white/8"
                />
              </label>

              <label className="flex flex-col text-sm">
                <span className="mb-2 text-white/80">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3 py-2 rounded-md bg-white/5 text-white border border-white/8"
                />
              </label>

              <button
                type="submit"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-md"
              >
                Sign In
              </button>

              <div className="flex items-center justify-between mt-2 text-sm">
                <a href="/forgot" className="text-white/70 hover:text-white">Forgot Password?</a>
                <a href="/signup" className="text-white/90 font-medium">Sign Up</a>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-sm text-white/70">
            New here? <a href="/signup" className="text-white underline">Create an account</a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

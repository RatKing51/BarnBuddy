import React, { useState } from "react";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SignUp() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!agree) return setError("You must agree to the terms.");
    if (password !== passwordConfirm)
      return setError("Passwords do not match.");

    try {
      // 1️⃣ Register user
      await register(name, email, password);

      // 2️⃣ Auto login after creating account
      await login(email, password);

      // 3️⃣ Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Sign Up form */}
            <div className="lg:col-span-6 flex items-center">
              <div className="w-full max-w-md mx-auto bg-[#0f2650] border border-white/6 rounded-xl p-8 shadow-lg">
                <h1 className="text-2xl font-semibold mb-6">Sign Up</h1>

                {error && (
                  <div className="text-red-400 text-sm mb-3">{error}</div>
                )}

                <form className="space-y-4 mt-4" onSubmit={handleSubmit}>

                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Name</span>
                    <input
                      name="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Email</span>
                    <input
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="you@farm.com"
                    />
                  </label>

                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Password</span>
                    <input
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="At least 8 characters"
                    />
                  </label>

                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Confirm Password</span>
                    <input
                      name="passwordConfirm"
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Repeat password"
                    />
                  </label>

                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/10 bg-white/6 focus:ring-blue-600"
                    />
                    <span className="text-white/80">
                      I agree to the{" "}
                      <a href="/terms" className="underline">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="/privacy" className="underline">
                        Privacy Policy
                      </a>
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-md transition-colors"
                  >
                    Create Account
                  </button>
                </form>
              </div>
            </div>

            {/* Right side info */}
            <div className="lg:col-span-6 flex items-center">
              <div className="w-full max-w-lg mx-auto bg-transparent rounded-xl p-6">
                <h2 className="text-3xl font-semibold mb-4">BarnBuddy.</h2>
                <p className="text-white/80 mb-6">
                  Simple, practical tools for small farms. Built from the farm
                  for the farm — record keeping that actually gets used.
                </p>

                <div className="grid grid-cols-1 gap-4 text-sm text-white/80">
                  <div>
                    <h4 className="font-semibold text-white">Why sign up?</h4>
                    <p className="mt-1">
                      Get early access to tailored workflows, keep track of
                      animals and supplies, and use tools designed for real
                      farm days.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">
                      What you’ll get
                    </h4>
                    <p className="mt-1">
                      Guides, exportable records, and step-by-step templates
                      that don't add overhead to your day.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">Privacy first</h4>
                    <p className="mt-1">
                      Your data stays yours. Export anytime and close your
                      account whenever you want.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-sm text-white/70 mb-3">Have questions?</p>
                  <a
                    href="/contact"
                    className="inline-block bg-white text-blue-700 px-4 py-2 rounded-md font-semibold hover:bg-blue-100 transition-colors"
                  >
                    Contact us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

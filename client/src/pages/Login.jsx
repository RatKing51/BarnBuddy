import React from 'react'
import Footer from '../components/Footer'

export default function Login() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      {/* Main content (no navbar — already on screen) */}
      <main className="flex-grow flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-[#0f2650] border border-white/6 rounded-xl p-8 shadow-lg">
            <h1 className="text-2xl font-semibold mb-6">LOGIN</h1>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <label className="flex flex-col text-sm">
                <span className="mb-2 text-white/80">Email</span>
                <input
                  type="email"
                  required
                  className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="you@farm.com"
                />
              </label>

              <label className="flex flex-col text-sm">
                <span className="mb-2 text-white/80">Password</span>
                <input
                  type="password"
                  required
                  className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="submit"
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-md transition-colors"
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

      {/* Footer (reuses your Footer component and styles) */}
      <Footer />
    </div>
  )
}
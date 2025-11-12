import React from 'react'
import Footer from '../components/Footer'

export default function SignUp() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Sign Up form (spans 6 columns on large screens) */}
            <div className="lg:col-span-6 flex items-center">
              <div className="w-full max-w-md mx-auto bg-[#0f2650] border border-white/6 rounded-xl p-8 shadow-lg">
                <h1 className="text-2xl font-semibold mb-6">Sign Up</h1>

                <form className="space-y-4 mt-4" noValidate>
                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Name</span>
                    <input
                      name="name"
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Your full name"
                    />
                  </label>

                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Email</span>
                    <input
                      name="email"
                      type="email"
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="you@farm.com"
                    />
                  </label>

                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Password</span>
                    <input
                      name="password"
                      type="password"
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="At least 8 characters"
                    />
                  </label>

                  <label className="flex flex-col text-sm">
                    <span className="mb-2 text-white/80">Password Confirm</span>
                    <input
                      name="passwordConfirm"
                      type="password"
                      className="px-3 py-2 rounded-md bg-white/5 placeholder-white/50 text-white border border-white/8 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="Repeat password"
                    />
                  </label>

                  <label className="flex items-start gap-3 text-sm">
                    <input
                      name="agree"
                      type="checkbox"
                      className="mt-1 w-4 h-4 rounded border-white/10 bg-white/6 focus:ring-blue-600"
                    />
                    <span className="text-white/80">
                      I agree to the <a href="/terms" className="underline">Terms of Service</a> and <a href="/privacy" className="underline">Privacy Policy</a>
                    </span>
                  </label>

                  <div>
                    <button
                      type="button"
                      className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-md transition-colors"
                    >
                      Sign Up
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right: informational / selling copy (spans 6 columns on large screens) */}
            <div className="lg:col-span-6 flex items-center">
              <div className="w-full max-w-lg mx-auto bg-transparent rounded-xl p-6">
                <h2 className="text-3xl font-semibold mb-4">BarnBuddy.</h2>
                <p className="text-white/80 mb-6">
                  Simple, practical tools for small farms. Built from the farm for the farm — record keeping that actually gets used.
                </p>

                <div className="grid grid-cols-1 gap-4 text-sm text-white/80">
                  <div>
                    <h4 className="font-semibold text-white">Why sign up?</h4>
                    <p className="mt-1">Get early access to tailored workflows, keep track of animals and supplies, and use tools designed for real farm days.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">What you’ll get</h4>
                    <p className="mt-1">Guides, exportable records, and step-by-step templates that don't add overhead to your day.</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">Privacy first</h4>
                    <p className="mt-1">Your data stays yours. Export anytime and close your account whenever you want.</p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-sm text-white/70 mb-3">Have questions?</p>
                  <a href="/contact" className="inline-block bg-white text-blue-700 px-4 py-2 rounded-md font-semibold hover:bg-blue-100 transition-colors">
                    Contact us
                  </a>
                </div>
              </div>
            </div>

            {/* Small screens: info will stack below the form naturally */}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
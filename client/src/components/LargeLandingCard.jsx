import React from 'react'
import '../index.css'

export default function LargeLandingCard() {
  return (
    <div className="bg-[#101D42] text-white py-12 px-6 lg:py-20 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
        {/* Left: Content */}
        <div className="space-y-6 lg:space-y-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold">Why Us?</h2>

          <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed">
            BarnBuddy is a livestock management platform built for small farmers, FFA and 4‑H members, and hobby ranchers. It replaces paper records with a single, easy-to-use system for tracking health, vaccinations, breeding cycles, and overall herd performance.
          </p>

          <p className="text-sm sm:text-base lg:text-lg opacity-90">
            Get clear herd histories, automated reminders, and simple reporting so you can spend less time on paperwork and more time with your animals.
          </p>

          <div>
            <a
              href="/signup"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 sm:py-4 sm:px-8 rounded-lg shadow-md transition-colors text-base sm:text-lg"
              aria-label="Sign up for BarnBuddy"
            >
              Sign Up
            </a>
          </div>
        </div>

        {/* Right: Visual placeholder */}
        <div className="flex justify-center md:justify-end">
          <div className="w-full max-w-md md:max-w-xl lg:max-w-2xl h-64 sm:h-80 md:h-96 bg-white/5 border-2 border-white/10 rounded-lg flex items-center justify-center p-4">
            <span className="text-white/40 text-sm sm:text-base lg:text-lg">Image or video goes here</span>
          </div>
        </div>
      </div>
    </div>
  )
}
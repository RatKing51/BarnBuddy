import React from 'react'
import Footer from '../components/Footer'

export default function About() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header / Hero */}
          <header className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-semibold">BarnBuddy.</h1>
            <p className="mt-3 text-white/80 text-lg">Doing For the Small</p>
          </header>

          {/* Two-column content: intro left, details right on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left column: main copy (spans 7 of 12 on large screens) */}
            <article className="lg:col-span-7 bg-[#0f2650] border border-white/6 rounded-xl p-8 shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">Simple livestock management built for small farms</h2>

              <p className="text-white/80 leading-relaxed mb-4">
                BarnBuddy. is a livestock management platform designed for small farmers, FFA/4H members, and hobby ranchers.
                The platform simplifies animal record-keeping by providing digital tools for tracking health, vaccinations, breeding cycles,
                and overall herd performance in one easy-to-use system.
              </p>

              <p className="text-white/80 leading-relaxed mb-4">
                Many small-scale livestock owners still rely on paper notebooks, spreadsheets, or memory to manage animal records.
                This often results in disorganized data, missed health treatments, and inefficiencies that can hurt animal well-being and productivity.
                BarnBuddy. addresses this problem by offering an affordable, youth-friendly, and accessible solution tailored specifically for smaller operations.
              </p>

              <p className="text-white/80 leading-relaxed mb-4">
                The primary target market includes FFA and 4H students, small family farms, and hobby livestock owners who want a simple alternative
                to expensive enterprise farm management software. With over 1,000,000 FFA members in the United States and millions of small-scale livestock
                operations nationwide, BarnBuddy. is positioned to fill a significant gap in agricultural technology.
              </p>

              <p className="text-white/80 leading-relaxed">
                BarnBuddy. will operate on a freemium model, where users can access core features at no cost while unlocking premium tools for just
                $5 per month. This pricing strategy makes the platform accessible for youth and small farmers while creating a sustainable revenue stream.
              </p>
            </article>

            {/* Right column: vision + opportunities (spans 5 of 12) */}
            <aside className="lg:col-span-5 flex flex-col gap-26.5">
              <div className="bg-white/6 border border-white/8 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Looking ahead</h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  Growth opportunities include a mobile app, reminder notifications, and partnerships with agricultural education programs.
                </p>
              </div>

              <div className="bg-white/6 border border-white/8 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Why BarnBuddy.</h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  By bridging the gap between agriculture and technology, BarnBuddy. aims to become a leading tool that empowers small farmers and youth
                  in agriculture to thrive through smarter livestock management.
                </p>
              </div>

              <div className="bg-white/6 border border-white/8 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Who we serve</h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  FFA and 4H students, small family farms, and hobby livestock owners who need straightforward, reliable tools — not enterprise complexity.
                </p>
              </div>
            </aside>
          </div>

          {/* Callout / pricing summary row */}
          <div className="mt-10 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Freemium model</div>
                <div className="text-sm text-white/90">Core tracking is free. Premium features (exports, analytics, herd comparisons) are $5/month.</div>
              </div>
              <div>
                <a href="/pricing" className="inline-block bg-white text-blue-700 px-4 py-2 rounded-md font-semibold hover:bg-blue-100 transition-colors">
                  View pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
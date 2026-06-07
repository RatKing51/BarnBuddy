import React from 'react'
import Footer from '../components/Footer'

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-semibold">Pricing</h1>
            <p className="mt-3 text-white/80">
              BarnBuddy uses a freemium model — basic tracking is free for everyone. Premium tools like exports,
              analytics, and herd comparisons are available for just $5/month.
            </p>
            <p className="mt-3 text-sm text-white/70">
              Schools and chapters can purchase group licenses at discounted rates. Contact us for volume pricing.
            </p>
          </div>

          {/* Pricing grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free */}
            <section className="bg-[#0f2650] border border-white/6 rounded-xl p-8 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Free</h2>
                  <p className="text-sm text-white/70 mt-1">Core tracking and daily workflows</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">Free</div>
                  <div className="text-xs text-white/60 mt-1">Always</div>
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-white/80">
                <li>• Basic record keeping (animals, supplies, notes)</li>
                <li>• One user account</li>
                <li>• Local export (CSV) for simple reports</li>
                <li>• Mobile-friendly workflows</li>
              </ul>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-white/70">No credit card required</span>
                <button className="ml-4 bg-white text-blue-700 px-4 py-2 rounded-md font-semibold hover:bg-blue-100 transition-colors">
                  Get started
                </button>
              </div>
            </section>

            {/* Premium */}
            <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-8 shadow-lg border border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Premium</h2>
                  <p className="text-sm text-white/90 mt-1">Advanced tools for farms that need more insight</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">$5</div>
                  <div className="text-xs text-white/80 mt-1">per month</div>
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-white/95">
                <li>• Data exports and scheduled exports</li>
                <li>• Analytics dashboard and trends</li>
                <li>• Herd comparisons and cohort reports</li>
                <li>• Multi-user access and shared farm accounts</li>
              </ul>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-white/80">Billed monthly. Cancel anytime.</span>
                <button className="ml-4 bg-white text-blue-700 px-4 py-2 rounded-md font-semibold hover:bg-blue-100 transition-colors">
                  Coming Soon!
                </button>
              </div>
            </section>
          </div>

          {/* Contact / Group licenses - now takes the whole width */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2 bg-white/6 border border-white/8 rounded-xl p-8 flex items-center justify-between">
              <div className="flex-1 pr-6">
                <h3 className="text-lg font-semibold text-white">Group licenses and volume pricing</h3>
                <p className="text-sm text-white/80 mt-2">
                  Discounted plans for schools, chapters, and multi-farm programs. Includes multiple seats, centralized billing, and priority support.
                </p>
                <p className="text-sm text-white/70 mt-3">
                  Tell us about your program and we’ll propose a plan that fits your needs and budget.
                </p>
              </div>

              <div className="text-right">
                <a
                  href="/contact"
                  className="inline-block bg-blue-600 text-white px-5 py-3 rounded-md font-semibold hover:bg-blue-500 transition-colors"
                >
                  Contact sales
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-white/70 max-w-2xl mx-auto">
            BarnBuddy uses a freemium approach so basic tracking stays free and accessible. Premium features power deeper insights while keeping the platform affordable.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
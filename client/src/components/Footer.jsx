import React from 'react'

export default function Footer() {
  return (
    <footer className="bg-[#07102a] text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand / about */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white">BB.</div>
              <span className="text-lg font-semibold">BarnBuddy.</span>
            </div>
            <p className="text-sm text-white/80 max-w-sm">
              Simple, practical tools for small farms. Built from the farm for the farm — record keeping that actually gets used.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Twitter">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43 1s-1.73 1.03-2.62 1.5A4.48 4.48 0 0 0 16.5.5c-2.5 0-4.5 2.24-4 4.7A12.94 12.94 0 0 1 3 2.1S1 7.1 6 9.6a4.48 4.48 0 0 1-2-.55v.06c0 2.2 1.54 4.04 3.6 4.46A4.52 4.52 0 0 1 3 14.4c.53 2 2.04 3.42 3.84 3.46A9 9 0 0 1 1 19.5 12.6 12.6 0 0 0 7.29 21c8.79 0 13.6-7.5 13.6-14v-.64A9.72 9.72 0 0 0 23 3z"/>
                </svg>
              </a>
              <a href="https://github.com/RatKing51/BarnBuddy" className="text-white/70 hover:text-white transition-colors" aria-label="Github">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5A12 12 0 0 0 0 12.7c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.2.8-.5v-2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1 1.6.7 2 .7.1-.6.4-1 .7-1.2-2.6-.3-5.3-1.3-5.3-6 0-1.3.5-2.3 1.1-3.1-.1-.3-.5-1.6.1-3.2 0 0 .9-.3 3 .9.8-.2 1.7-.3 2.6-.3s1.8.1 2.6.3c2-.1 3-.9 3-.9.6 1.6.2 2.9.1 3.2.7.8 1.1 1.8 1.1 3.1 0 4.7-2.7 5.6-5.3 6 .4.4.8 1 .8 2v3c0 .3.2.6.8.5A12 12 0 0 0 24 .5 12 12 0 0 0 12 .5z"/>
                </svg>
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="LinkedIn">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v6h-4v-6a2 2 0 0 0-4 0v6h-4v-12h4v2"/>
                  <rect x="2" y="8" width="4" height="12" rx="1"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="/docs" className="hover:text-white">Docs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="/aboutus" className="hover:text-white">About</a></li>
                <li><a href="/news" className="hover:text-white">News</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li><a href="/help" className="hover:text-white">Help Center</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
                <li><a href="/status" className="hover:text-white">Status</a></li>
              </ul>
            </div>
          </div>

          {/* Newsletter / CTA */}
          <div className="md:col-span-3 lg:col-span-1">
            <h4 className="text-sm font-semibold mb-3">Get updates</h4>
            <p className="text-sm text-white/80 mb-4">Short updates about new features, guides, and tips for small farms.</p>
            <form className="flex items-center gap-3">
              <input
                type="email"
                placeholder="you@farm.com"
                className="w-full px-3 py-2 rounded-md bg-white/6 placeholder-white/60 text-white focus:outline-none border border-white/8"
              />
              <button className="px-4 py-2 bg-blue-600 rounded-md font-semibold hover:bg-blue-500 transition-colors">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/6 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-sm text-white/70">
          <p>© {new Date().getFullYear()} BarnBuddy. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <a href="/termsofserviceandprivacypolicy#pp" className="hover:text-white">Privacy</a>
            <a href="/termsofserviceandprivacypolicy#tos" className="hover:text-white">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

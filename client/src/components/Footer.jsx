import React, { useState } from 'react'
import { API_BASE_URL } from '../config/env'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleNewsletterSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', message: '' })

    try {
      setSubmitting(true)
      const res = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'footer',
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Could not subscribe right now.')
      }

      setEmail('')
      setStatus({ type: 'success', message: 'You are on the list.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

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
              <a href="https://github.com/RatKing51/BarnBuddy" className="text-white/70 hover:text-white transition-colors" aria-label="Github">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .5A12 12 0 0 0 0 12.7c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.2.8-.5v-2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.1 1.7 1.1 1 .1 1.6.7 2 .7.1-.6.4-1 .7-1.2-2.6-.3-5.3-1.3-5.3-6 0-1.3.5-2.3 1.1-3.1-.1-.3-.5-1.6.1-3.2 0 0 .9-.3 3 .9.8-.2 1.7-.3 2.6-.3s1.8.1 2.6.3c2-.1 3-.9 3-.9.6 1.6.2 2.9.1 3.2.7.8 1.1 1.8 1.1 3.1 0 4.7-2.7 5.6-5.3 6 .4.4.8 1 .8 2v3c0 .3.2.6.8.5A12 12 0 0 0 24 .5 12 12 0 0 0 12 .5z"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@barnbuddypro?is_from_webapp=1&sender_device=pc" className="text-white/70 hover:text-white transition-colors" aria-label="TikTok">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.35 6.35 0 0 0-5.46 10.96 6.34 6.34 0 0 0 10.87-4.43v-7a8.16 8.16 0 0 0 4.77 1.52V7a4.84 4.84 0 0 1-.95-.31z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/barnbuddypro/" className="text-white/70 hover:text-white transition-colors" aria-label="Instagram">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-2.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z" />
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
                <li><a href="https://doc.barnbuddy.pro" className="hover:text-white">Docs</a></li>
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
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@farm.com"
                required
                className="w-full px-3 py-2 rounded-md bg-white/6 placeholder-white/60 text-white focus:outline-none border border-white/8"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 rounded-md font-semibold hover:bg-blue-500 transition-colors disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? 'Saving...' : 'Subscribe'}
              </button>
            </form>
            {status.message && (
              <p className={`mt-3 text-sm ${
                status.type === 'success' ? 'text-emerald-200' : 'text-red-200'
              }`}>
                {status.message}
              </p>
            )}
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

import React, { useState } from 'react'
import { UserButton, useAuth } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import '../index.css'

const Navbar = () => {
  const [open, setOpen] = useState(false)
  const { isLoaded, isSignedIn } = useAuth()
  const showSignedIn = isLoaded && isSignedIn

  const closeMenu = () => setOpen(false)

  return (
    <nav className="bg-[#101D42] text-white">
      <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <Link to="/" onClick={closeMenu} className="flex items-center flex-shrink-0 z-20">
            <span className="text-3xl font-bold leading-none">
              <span className="text-blue-500">Barn</span>
              <span className="text-gray-300">Buddy.</span>
            </span>
          </Link>

          {/* Center: Tagline only on desktop */}
          <div className="hidden md:flex md:flex-1 md:justify-center">
            <h1 className="mx-auto text-center text-white text-lg font-bold md:text-lg lg:text-xl">
              Doing for the Small
            </h1>
          </div>

          {/* Right: Desktop links */}
          <div className="hidden md:flex md:items-center md:space-x-6 z-20">
            <Link to="/aboutus" className="text-white text-xl font-bold hover:text-blue-300 transition-colors">
              About Us
            </Link>
            <Link to="/pricing" className="text-white text-xl font-bold hover:text-blue-300 transition-colors">
              Pricing
            </Link>
            <Link to="/news" className="text-white text-xl font-bold hover:text-blue-300 transition-colors">
              News
            </Link>
            {showSignedIn ? (
              <>
                <Link to="/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold py-2 px-4 rounded-md transition-colors">
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <Link to="/signup" className="bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold py-2 px-4 rounded-md transition-colors">
                Sign Up
                </Link>
                <Link to="/login" className="text-white text-xl font-bold hover:text-orange-400 transition-colors">
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center z-20">
            <button
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label="Toggle menu"
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu (collapsible) */}
      <div className={`md:hidden transition-max-h duration-300 overflow-hidden ${open ? 'max-h-72' : 'max-h-0'}`}>
        <div className="px-4 pt-2 pb-4 space-y-2">
          <Link to="/aboutus" onClick={closeMenu} className="block text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
            About Us
          </Link>
          <Link to="/pricing" onClick={closeMenu} className="block text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
            Pricing
          </Link>
          <Link to="/news" onClick={closeMenu} className="block text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
            News
          </Link>
          {showSignedIn ? (
            <>
              <Link to="/dashboard" onClick={closeMenu} className="block bg-blue-500 hover:bg-blue-600 text-white text-base font-medium py-2 px-3 rounded-md">
                Dashboard
              </Link>
              <div className="py-2 px-2">
                <UserButton afterSignOutUrl="/" />
              </div>
            </>
          ) : (
            <>
              <Link to="/signup" onClick={closeMenu} className="block bg-blue-500 hover:bg-blue-600 text-white text-base font-medium py-2 px-3 rounded-md">
                Sign Up
              </Link>
              <Link to="/login" onClick={closeMenu} className="block text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
                Login
              </Link>
            </>
          )}

          {/* Optional: show tagline on mobile */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-sm text-white/90">Doing for the Small</p>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

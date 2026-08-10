import React, { useEffect, useRef, useState } from 'react'
import { UserButton, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react'
import { Link, useLocation } from 'react-router'
import { ADMIN_CLERK_USER_IDS, ADMIN_EMAILS } from '../config/env'
import { useAuth as useBarnBuddyAuth } from '../context/AuthContext'
import PremiumExpiryBadge from './PremiumExpiryBadge'
import '../index.css'

const Navbar = () => {
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const location = useLocation()
  const { isLoaded, isSignedIn } = useClerkAuth()
  const { subscription } = useBarnBuddyAuth()
  const { user } = useUser()
  const showSignedIn = isLoaded && isSignedIn
  const primaryEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ''
  const showAdmin = Boolean(
    showSignedIn &&
      ((primaryEmail && ADMIN_EMAILS.includes(primaryEmail)) ||
        (user?.id && ADMIN_CLERK_USER_IDS.includes(user.id)))
  )

  const closeMenu = () => setOpen(false)
  const isCurrent = (path) => location.pathname === path

  useEffect(() => {
    if (!open) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  return (
    <header className="bg-[#101D42] text-white">
      <nav aria-label="Primary navigation">
      <div className="max-w-10xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <Link to="/" onClick={closeMenu} aria-label="BarnBuddy home" aria-current={isCurrent('/') ? 'page' : undefined} className="flex min-h-11 items-center flex-shrink-0 z-20">
            <span className="text-3xl font-bold leading-none">
              <span className="text-blue-500">Barn</span>
              <span className="text-gray-300">Buddy.</span>
            </span>
          </Link>

          {/* Center: Tagline only on desktop */}
          <div className="hidden md:flex md:flex-1 md:justify-center">
            <p className="mx-auto text-center text-white text-lg font-bold md:text-lg lg:text-xl">
              Doing for the Small
            </p>
          </div>

          {/* Right: Desktop links */}
          <div className="hidden md:flex md:items-center md:space-x-6 z-20">
            <Link to="/aboutus" aria-current={isCurrent('/aboutus') ? 'page' : undefined} className="inline-flex min-h-11 items-center text-white text-xl font-bold hover:text-blue-300 transition-colors">
              About Us
            </Link>
            <Link to="/pricing" aria-current={isCurrent('/pricing') ? 'page' : undefined} className="inline-flex min-h-11 items-center text-white text-xl font-bold hover:text-blue-300 transition-colors">
              Pricing
            </Link>
            <Link to="/news" aria-current={isCurrent('/news') ? 'page' : undefined} className="inline-flex min-h-11 items-center text-white text-xl font-bold hover:text-blue-300 transition-colors">
              News
            </Link>
            {showSignedIn ? (
              <>
                {showAdmin && (
                  <Link to="/admin" className="inline-flex min-h-11 items-center text-white text-xl font-bold hover:text-blue-300 transition-colors">
                    Admin
                  </Link>
                )}
                <Link to="/dashboard" aria-current={location.pathname.startsWith('/dashboard') ? 'page' : undefined} className="inline-flex min-h-11 items-center bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-2 px-4 rounded-md transition-colors">
                  Dashboard
                </Link>
                <PremiumExpiryBadge subscription={subscription} />
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <Link to="/signup" aria-current={location.pathname.startsWith('/signup') ? 'page' : undefined} className="inline-flex min-h-11 items-center bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-2 px-4 rounded-md transition-colors">
                Sign Up
                </Link>
                <Link to="/login" aria-current={location.pathname.startsWith('/login') ? 'page' : undefined} className="inline-flex min-h-11 items-center text-white text-xl font-bold hover:text-orange-400 transition-colors">
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center z-20">
            <button
              ref={menuButtonRef}
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mobile-primary-menu"
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
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
      {open && <div id="mobile-primary-menu" className="md:hidden">
        <div className="px-4 pt-2 pb-4 space-y-2">
          <Link to="/aboutus" onClick={closeMenu} aria-current={isCurrent('/aboutus') ? 'page' : undefined} className="flex min-h-11 items-center text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
            About Us
          </Link>
          <Link to="/pricing" onClick={closeMenu} aria-current={isCurrent('/pricing') ? 'page' : undefined} className="flex min-h-11 items-center text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
            Pricing
          </Link>
          <Link to="/news" onClick={closeMenu} aria-current={isCurrent('/news') ? 'page' : undefined} className="flex min-h-11 items-center text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
            News
          </Link>
          {showSignedIn ? (
            <>
              {showAdmin && (
                <Link to="/admin" onClick={closeMenu} className="flex min-h-11 items-center text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
                  Admin
                </Link>
              )}
              <Link to="/dashboard" onClick={closeMenu} aria-current={location.pathname.startsWith('/dashboard') ? 'page' : undefined} className="flex min-h-11 items-center bg-blue-600 hover:bg-blue-700 text-white text-base font-medium py-2 px-3 rounded-md">
                Dashboard
              </Link>
              <div className="py-2 px-2">
                <PremiumExpiryBadge subscription={subscription} className="mr-3" />
                <UserButton afterSignOutUrl="/" />
              </div>
            </>
          ) : (
            <>
              <Link to="/signup" onClick={closeMenu} aria-current={location.pathname.startsWith('/signup') ? 'page' : undefined} className="flex min-h-11 items-center bg-blue-600 hover:bg-blue-700 text-white text-base font-medium py-2 px-3 rounded-md">
                Sign Up
              </Link>
              <Link to="/login" onClick={closeMenu} aria-current={location.pathname.startsWith('/login') ? 'page' : undefined} className="flex min-h-11 items-center text-white text-base font-medium py-2 px-2 rounded hover:bg-white/5">
                Login
              </Link>
            </>
          )}

          {/* Optional: show tagline on mobile */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-sm text-white/90">Doing for the Small</p>
          </div>
        </div>
      </div>}
      </nav>
    </header>
  )
}

export default Navbar

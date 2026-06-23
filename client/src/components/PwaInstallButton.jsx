import React, { useEffect, useMemo, useState } from 'react'

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isMobilePhone, setIsMobilePhone] = useState(false)
  const [showInstallHelp, setShowInstallHelp] = useState(false)

  const isIos = useMemo(() => {
    if (typeof window === 'undefined') return false

    return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    setIsStandalone(standalone)

    function updateMobilePhoneState() {
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches
      const phoneWidth = window.matchMedia('(max-width: 767px)').matches
      const mobileUserAgent = /android|iphone|ipod/i.test(window.navigator.userAgent)

      setIsMobilePhone(coarsePointer && phoneWidth && mobileUserAgent)
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setInstallPrompt(event)
    }

    function handleAppInstalled() {
      setInstallPrompt(null)
      setIsStandalone(true)
      setShowInstallHelp(false)
    }

    updateMobilePhoneState()
    window.addEventListener('resize', updateMobilePhoneState)
    window.addEventListener('orientationchange', updateMobilePhoneState)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('resize', updateMobilePhoneState)
      window.removeEventListener('orientationchange', updateMobilePhoneState)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  if (isStandalone || !isMobilePhone) {
    return null
  }

  async function handleInstallClick() {
    if (!installPrompt) {
      setShowInstallHelp((current) => !current)
      return
    }

    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <div className="w-full max-w-md sm:max-w-none">
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-400 px-5 py-3 text-center text-base font-semibold text-[#07111f] shadow-md shadow-black/20 transition-colors hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-[#101D42] sm:w-auto"
      >
        Install BarnBuddy on your phone
      </button>

      {showInstallHelp && (
        <div className="mt-3 rounded-lg border border-white/12 bg-white/8 p-4 text-sm leading-relaxed text-white/82">
          {isIos ? (
            <p>
              On iPhone, tap Share in Safari, then choose Add to Home Screen.
            </p>
          ) : (
            <p>
              Open this page in Chrome or Edge, then use the browser menu to install BarnBuddy.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

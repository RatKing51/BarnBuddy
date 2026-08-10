import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Footer from '../components/Footer'
import { getSiteContent } from '../api/siteContent'
import { defaultStatus } from '../data/siteContent'

const toneClasses = {
  blue: 'bg-blue-300',
  green: 'bg-green-300',
  yellow: 'bg-yellow-300',
  red: 'bg-red-300',
}

const badgeClasses = {
  blue: 'border-blue-300/20 bg-blue-300/12 text-blue-100',
  green: 'border-green-300/20 bg-green-300/12 text-green-100',
  yellow: 'border-yellow-300/20 bg-yellow-300/12 text-yellow-100',
  red: 'border-red-300/20 bg-red-300/12 text-red-100',
}

function formatUpdatedAt(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default function Status() {
  const [status, setStatus] = useState(null)
  const [updatedAt, setUpdatedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      setLoading(true)
      setError('')

      try {
        const data = await getSiteContent()
        if (!data?.status?.headline || !data?.status?.overallStatus) {
          throw new Error('Status information was incomplete')
        }

        if (!cancelled) {
          setStatus({
            ...defaultStatus,
            ...data.status,
            services: Array.isArray(data.status.services) ? data.status.services : [],
          })
          setUpdatedAt(data.updatedAt || '')
        }
      } catch (err) {
        console.warn('Could not load live status content:', err.message)
        if (!cancelled) {
          setStatus(null)
          setUpdatedAt('')
          setError('We could not confirm the current service status. Please try again in a moment.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const overallTone = status?.overallTone || 'blue'
  const lastUpdatedLabel = formatUpdatedAt(updatedAt)

  return (
    <div className="public-page flex min-h-screen flex-col text-white">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0f2650] p-6 sm:p-8 shadow-2xl shadow-black/20">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">Status</p>

              {loading ? (
                <div className="grid min-h-72 place-items-center py-10 text-center" role="status" aria-live="polite" aria-atomic="true">
                  <div>
                    <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-blue-200/20 border-t-blue-300" aria-hidden="true" />
                    <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-4xl">Checking BarnBuddy services...</h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/68 sm:text-base">
                      Loading the latest service information.
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="mt-6 rounded-xl border border-amber-300/25 bg-amber-400/8 p-5 sm:p-7" role="alert">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-300/15 text-xl font-bold text-amber-100" aria-hidden="true">!</div>
                  <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">Live status is temporarily unavailable</h1>
                  <p className="mt-3 max-w-2xl leading-relaxed text-white/76">{error}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/60">
                    This does not necessarily mean BarnBuddy is down.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setRefreshKey((current) => current + 1)}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                      Try again
                    </button>
                    <Link
                      to="/contact?topic=Support%20request"
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/14 bg-white/6 px-5 py-3 font-semibold text-white hover:bg-white/10"
                    >
                      Contact support
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">{status.headline}</h1>
                      <p className="mt-3 text-white/72">{status.summary}</p>
                    </div>
                    <span role="status" aria-live="polite" aria-atomic="true" className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${badgeClasses[overallTone] || badgeClasses.blue}`}>
                      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${toneClasses[overallTone] || toneClasses.blue}`} />
                      {status.overallStatus}
                    </span>
                  </div>

                  <div className="mt-8 space-y-3">
                    {status.services.length > 0 ? (
                      status.services.map((service) => (
                        <div key={service.name} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/6 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-semibold text-white">{service.name}</span>
                          <span className="flex items-center gap-2 text-sm text-white/70">
                            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${toneClasses[service.tone] || toneClasses.blue}`} />
                            {service.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-white/14 bg-white/5 p-5 text-sm leading-relaxed text-white/65">
                        Individual service details are not available right now.
                      </div>
                    )}
                  </div>

                  {(status.recentUpdateTitle || status.recentUpdateBody) && (
                    <div className="mt-8 rounded-xl border border-white/10 bg-[#101D42] p-5">
                      <h2 className="text-lg font-semibold">{status.recentUpdateTitle || 'Recent updates'}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/65">
                        {status.recentUpdateBody || 'No additional service notes are available.'}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
                    <p>{lastUpdatedLabel ? `Last updated ${lastUpdatedLabel}` : 'Status information loaded live.'}</p>
                    <Link className="font-semibold text-blue-200 hover:text-white" to="/contact?topic=Support%20request">
                      Report a problem
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

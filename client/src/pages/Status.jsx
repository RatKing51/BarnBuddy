import React, { useEffect, useState } from 'react'
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

export default function Status() {
  const [status, setStatus] = useState(defaultStatus)

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      try {
        const data = await getSiteContent()
        if (!cancelled && data.status) {
          setStatus({ ...defaultStatus, ...data.status })
        }
      } catch (err) {
        console.warn('Using bundled status content:', err.message)
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [])

  const overallTone = status.overallTone || 'green'

  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0f2650] p-6 sm:p-8 shadow-2xl shadow-black/20">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">Status</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">{status.headline}</h1>
                  <p className="mt-3 text-white/72">{status.summary}</p>
                </div>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${badgeClasses[overallTone] || badgeClasses.green}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[overallTone] || toneClasses.green}`} />
                  {status.overallStatus}
                </span>
              </div>

              <div className="mt-8 space-y-3">
                {(status.services || []).map((service) => (
                  <div key={service.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/6 px-4 py-4">
                    <span className="font-semibold text-white">{service.name}</span>
                    <span className="flex items-center gap-2 text-sm text-white/70">
                      <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[service.tone] || toneClasses.green}`} />
                      {service.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-[#101D42] p-5">
                <h2 className="text-lg font-semibold">{status.recentUpdateTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {status.recentUpdateBody}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

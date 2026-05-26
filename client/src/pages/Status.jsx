import React from 'react'
import Footer from '../components/Footer'

const systems = [
  ['Web app', 'Operational', 'green'],
  ['Login and accounts', 'Operational', 'green'],
  ['Animal records', 'Operational', 'green'],
  ['Notifications', 'Planned', 'blue'],
]

const toneClasses = {
  blue: 'bg-blue-300',
  green: 'bg-green-300',
}

export default function Status() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-[#0f2650] p-6 sm:p-8 shadow-2xl shadow-black/20">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">Status</p>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">All systems normal</h1>
                  <p className="mt-3 text-white/72">Placeholder status page for BarnBuddy services.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-green-300/20 bg-green-300/12 px-4 py-2 text-sm font-semibold text-green-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
                  Operational
                </span>
              </div>

              <div className="mt-8 space-y-3">
                {systems.map(([name, status, tone]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/6 px-4 py-4">
                    <span className="font-semibold text-white">{name}</span>
                    <span className="flex items-center gap-2 text-sm text-white/70">
                      <span className={`h-2.5 w-2.5 rounded-full ${toneClasses[tone]}`} />
                      {status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-[#101D42] p-5">
                <h2 className="text-lg font-semibold">Recent updates</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  No incidents reported. Replace this with real incident history or a status provider later.
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

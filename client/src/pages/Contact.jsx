import React from 'react'
import Footer from '../components/Footer'

const contactMethods = [
  {
    label: 'Email',
    value: 'hello@barnbuddy.example',
    detail: 'Best for product questions, support, and partnership ideas.',
  },
  {
    label: 'Response time',
    value: '1-2 business days',
    detail: 'Filler timing for now. Swap this when real support coverage is set.',
  },
  {
    label: 'Location',
    value: 'Kansas, United States',
    detail: 'Built with small farms, FFA, and 4H communities in mind.',
  },
]

const supportTopics = ['Account help', 'Feature ideas', 'School or chapter plans', 'Bug reports']

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">Contact</p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">Talk to BarnBuddy</h1>
              <p className="mt-4 text-white/78 text-lg leading-relaxed">
                Questions, feedback, farm-program ideas, or support needs can start here. This page is ready for real contact details whenever you are.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <aside className="lg:col-span-5 space-y-5">
                <div className="rounded-xl border border-white/10 bg-[#0f2650] p-6 sm:p-8 shadow-xl shadow-black/20">
                  <h2 className="text-2xl font-semibold">How to reach us</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/72">
                    Use these placeholder channels for now. Later, this can connect to a real inbox, support tool, or admin notification flow.
                  </p>

                  <div className="mt-7 space-y-4">
                    {contactMethods.map((method) => (
                      <div key={method.label} className="rounded-lg border border-white/10 bg-white/6 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">{method.label}</p>
                        <p className="mt-2 text-lg font-semibold text-white">{method.value}</p>
                        <p className="mt-1 text-sm leading-relaxed text-white/62">{method.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/6 p-6">
                  <h3 className="text-lg font-semibold">Good things to include</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {supportTopics.map((topic) => (
                      <span key={topic} className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-sm text-white/78">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </aside>

              <section className="lg:col-span-7 rounded-xl border border-white/10 bg-white/6 p-6 sm:p-8 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Send a message</h2>
                    <p className="mt-2 text-sm text-white/65">Filler form for now. It is styled, but not connected to email yet.</p>
                  </div>
                  <span className="rounded-full bg-blue-500/16 px-3 py-1 text-xs font-semibold text-blue-100">Coming soon</span>
                </div>

                <form className="mt-7 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="text-sm font-medium text-white/78">Name</span>
                      <input
                        type="text"
                        placeholder="Your name"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white placeholder-white/38 outline-none transition-colors focus:border-blue-300"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-white/78">Email</span>
                      <input
                        type="email"
                        placeholder="you@farm.com"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white placeholder-white/38 outline-none transition-colors focus:border-blue-300"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-white/78">Topic</span>
                    <select className="mt-2 w-full rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white outline-none transition-colors focus:border-blue-300">
                      <option>General question</option>
                      <option>Support request</option>
                      <option>School or chapter pricing</option>
                      <option>Feature idea</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-white/78">Message</span>
                    <textarea
                      rows="6"
                      placeholder="Tell us what is going on..."
                      className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white placeholder-white/38 outline-none transition-colors focus:border-blue-300"
                    />
                  </label>

                  <button
                    type="button"
                    className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-500 sm:w-auto"
                  >
                    Send message
                  </button>
                </form>
              </section>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                ['For farmers', 'Ask about setup, animal records, reminders, or keeping workflows simple.'],
                ['For students', 'Use this for FFA, 4H, SAE, or project record questions.'],
                ['For programs', 'Reach out for school, chapter, or group-license conversations.'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-lg border border-white/8 bg-white/5 p-5">
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/64">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

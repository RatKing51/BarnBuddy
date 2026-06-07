import React, { useState } from 'react'
import Footer from '../components/Footer'
import { API_URL } from '../config/env'

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
const CONTACT_COOLDOWN_KEY = 'barnbuddy_contact_last_sent_at'
const CONTACT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

function getContactCooldown() {
  const lastSentAt = Number(window.localStorage.getItem(CONTACT_COOLDOWN_KEY) || 0)

  if (!lastSentAt) return { active: false, remainingDays: 0 }

  const remainingMs = CONTACT_COOLDOWN_MS - (Date.now() - lastSentAt)

  if (remainingMs <= 0) {
    window.localStorage.removeItem(CONTACT_COOLDOWN_KEY)
    return { active: false, remainingDays: 0 }
  }

  return {
    active: true,
    remainingDays: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
  }
}

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: 'General question',
    message: '',
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(() => getContactCooldown())

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', message: '' })

    try {
      const currentCooldown = getContactCooldown()
      setCooldown(currentCooldown)

      if (currentCooldown.active) {
        throw new Error(`You can send one contact message per device each week. Try again in ${currentCooldown.remainingDays} day${currentCooldown.remainingDays === 1 ? '' : 's'}.`)
      }

      setSubmitting(true)
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message.')
      }

      setForm({
        name: '',
        email: '',
        topic: 'General question',
        message: '',
      })
      window.localStorage.setItem(CONTACT_COOLDOWN_KEY, String(Date.now()))
      setCooldown(getContactCooldown())
      setStatus({ type: 'success', message: 'Message sent. We will get back to you soon.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

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
                    <p className="mt-2 text-sm text-white/65">Send questions, support notes, or program inquiries straight to the BarnBuddy inbox.</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/16 px-3 py-1 text-xs font-semibold text-emerald-100">Email enabled</span>
                </div>

                <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <label className="block">
                      <span className="text-sm font-medium text-white/78">Name</span>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Your name"
                        required
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white placeholder-white/38 outline-none transition-colors focus:border-blue-300"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-white/78">Email</span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="you@farm.com"
                        required
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white placeholder-white/38 outline-none transition-colors focus:border-blue-300"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-white/78">Topic</span>
                    <select
                      value={form.topic}
                      onChange={(e) => updateField('topic', e.target.value)}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white outline-none transition-colors focus:border-blue-300"
                    >
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
                      value={form.message}
                      onChange={(e) => updateField('message', e.target.value)}
                      placeholder="Tell us what is going on..."
                      required
                      className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white placeholder-white/38 outline-none transition-colors focus:border-blue-300"
                    />
                  </label>

                  {status.message && (
                    <p className={`rounded-lg border px-4 py-3 text-sm ${
                      status.type === 'success'
                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                        : 'border-red-400/30 bg-red-500/10 text-red-100'
                    }`}>
                      {status.message}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || cooldown.active}
                    className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                  >
                    {submitting ? 'Sending...' : cooldown.active ? 'Message sent this week' : 'Send message'}
                  </button>
                  {cooldown.active && (
                    <p className="text-sm text-white/60">
                      You can send another message from this device in {cooldown.remainingDays} day{cooldown.remainingDays === 1 ? '' : 's'}.
                    </p>
                  )}
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

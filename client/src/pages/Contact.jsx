import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Footer from '../components/Footer'
import { API_URL } from '../config/env'

const topicPrompts = {
  'General question': 'What would you like to know about BarnBuddy?',
  'Support request': 'Which part of BarnBuddy are you using, and where are you getting stuck?',
  'Bug report': 'What did you try, and what happened? Include any error message you saw.',
  'Review or feedback': 'What worked well for you? What would you change?',
  'School or chapter pricing': 'Which school or chapter is this for, and about how many members need access?',
  'Feature idea': 'What would you like to do with your herd or project records?',
}
const contactTopicOptions = Object.keys(topicPrompts)
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
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    email: '',
    topic: 'General question',
    message: '',
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(() => getContactCooldown())

  useEffect(() => {
    const requestedTopic = searchParams.get('topic')
    if (contactTopicOptions.includes(requestedTopic)) {
      setForm((current) => ({ ...current, topic: requestedTopic }))
    }
  }, [searchParams])

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
      setStatus({ type: 'success', message: `Message sent. Look for a reply at ${form.email}.` })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="public-page flex min-h-screen flex-col text-white">
      <main className="flex-grow">
        <div className="bb-container bb-section bb-contact-layout">
          <header className="bb-contact-intro bb-route-intro">
            <h1>Contact BarnBuddy</h1>
            <p>Need help with a record, have an idea, or want pricing for your FFA chapter? Send a note here. We’ll reply by email.</p>
          </header>
          <form className="bb-contact-form space-y-5" aria-label="Contact BarnBuddy" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-white/78">Topic</span>
              <select
                value={form.topic}
                onChange={(e) => updateField('topic', e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white outline-none transition-colors focus:border-blue-300"
              >
                {contactTopicOptions.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="block">
                <span className="text-sm font-medium text-white/78">Name</span>
                <input
                  autoComplete="name"
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
                  autoComplete="email"
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
              <span className="text-sm font-medium text-white/78">Message</span>
              <textarea
                rows="5"
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
                aria-describedby="contact-message-hint"
                required
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-[#101D42] px-4 py-3 text-white placeholder-white/38 outline-none transition-colors focus:border-blue-300"
              />
            </label>
            <p id="contact-message-hint" className="text-sm text-slate-300">{topicPrompts[form.topic]}</p>

            {status.message && (
              <p role={status.type === 'error' ? 'alert' : 'status'} aria-live="polite" aria-atomic="true" className={`rounded-lg border px-4 py-3 text-sm ${
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
              className="min-h-11 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {submitting ? 'Sending...' : cooldown.active ? 'Message already sent' : 'Send message'}
            </button>
            {cooldown.active && (
              <p className="text-sm text-white/60">
                You can send another message from this device in {cooldown.remainingDays} day{cooldown.remainingDays === 1 ? '' : 's'}.
              </p>
            )}
          </form>
          <aside className="bb-contact-links" aria-label="Other ways to get help">
            <h2>Prefer email?</h2>
            <a className="bb-text-link" href="mailto:barnbuddyapp@gmail.com">barnbuddyapp@gmail.com</a>
            <div className="mt-5 border-t border-white/15 pt-4">
              <h2>Looking for instructions?</h2>
              <Link className="bb-text-link" to="/help">Browse the help guides</Link>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  )
}

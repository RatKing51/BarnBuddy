import React from 'react'
import { Link } from 'react-router'
import Footer from '../components/Footer'

const docsUrl = 'https://doc.barnbuddy.pro'

const guides = [
  ["Add your first animal", "Start with a name or ear tag, then enter the details you know.", "getting-started/add-first-animal"],
  ["Update an animal profile", "Find an animal and change its identification or notes.", "records/animals"],
  ["Record a treatment", "Log a vaccination, treatment, or follow-up date.", "records/health-records"],
  ["Keep an FFA project journal", "Link project animals, record activities, and prepare a summary.", "premium/ffa-project-mode"],
];

const quickAnswers = [
  ['Can I use BarnBuddy for one animal?', 'Yes. It works for a single project animal or a small herd.'],
  ['Where can I find detailed guides?', 'Open the BarnBuddy documentation for step-by-step account, record, and Premium feature guides.'],
  ['Where do I ask for help?', 'Contact BarnBuddy support and include your account email, what you were trying to do, and any error message you saw.'],
]

export default function HelpCenter() {
  return (
    <div className="public-page flex min-h-screen flex-col text-white">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-7xl mx-auto">
            <header className="bb-route-intro">
              <h1>BarnBuddy help</h1>
              <p>Choose the job you're working on to open its step-by-step guide.</p>
            </header>
            <div className="bb-help-layout">
              <div>
                {guides.map(([title, copy, path]) => (
                  <a key={path} href={`${docsUrl}/${path}`} className="bb-guide-row">
                    <div><h2>{title}</h2><p>{copy}</p></div>
                    <span aria-hidden="true">→</span>
                  </a>
                ))}
                <a href={docsUrl} className="bb-text-link">Browse all guides</a>
              </div>
              <aside className="bb-help-aside">
                <h2>Quick answers</h2>
                {quickAnswers.map(([question, answer]) => (
                  <details key={question}>
                    <summary>{question}</summary><p>{answer}</p>
                  </details>
                ))}
                <Link to="/contact" className="bb-button bb-button-secondary">Contact support</Link>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

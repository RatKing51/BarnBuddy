import React from 'react'
import Footer from '../components/Footer'

const helpTopics = [
  {
    title: 'Getting started',
    copy: 'Create an account, add your first herd, then add animals with basic details like name, tag number, birth date, and notes.',
  },
  {
    title: 'Animal records',
    copy: 'Use animal profiles to keep general data, health history, vaccinations, vet visits, and quick dates together.',
  },
  {
    title: 'Health tracking',
    copy: 'Log checkups, treatments, vaccines, and follow-up dates so upcoming care is easier to see from the dashboard.',
  },
  {
    title: 'Schools and chapters',
    copy: 'BarnBuddy is built with FFA, 4H, and small programs in mind. Group setup details can live here later.',
  },
]

const quickAnswers = [
  ['Can I use BarnBuddy for one animal?', 'Yes. It works for a single project animal or a small herd.'],
  ['Does the Help Center submit tickets yet?', 'Not yet. '],
  ['Where do I ask for help?', 'Use the Contact page for now and include your account email plus what you were trying to do.'],
]

export default function HelpCenter() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">Help Center</p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">BarnBuddy support starts here</h1>
              <p className="mt-4 text-white/78 text-lg leading-relaxed">
                Starter help content for common workflows. These sections can become full docs once the product details settle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {helpTopics.map((topic) => (
                <article key={topic.title} className="rounded-xl border border-white/10 bg-white/6 p-6 shadow-xl shadow-black/15">
                  <h2 className="text-xl font-semibold">{topic.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/68">{topic.copy}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-xl border border-white/10 bg-[#0f2650] p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Quick answers</h2>
                  <p className="mt-2 text-sm text-white/65">Temporary FAQ content until there is a full knowledge base.</p>
                </div>
                <a href="/contact" className="inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500">
                  Contact support
                </a>
              </div>

              <div className="mt-6 divide-y divide-white/10">
                {quickAnswers.map(([question, answer]) => (
                  <div key={question} className="py-4">
                    <h3 className="font-semibold text-white">{question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/66">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

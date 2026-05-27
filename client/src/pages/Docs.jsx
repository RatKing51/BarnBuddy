import React from 'react'
import Footer from '../components/Footer'

const docSections = [
  {
    title: '1. Create your farm account',
    copy:
      'Sign up, log in, and use the dashboard as your main workspace. Account setup is handled through Clerk, so users can securely manage access.',
  },
  {
    title: '2. Add herds and animals',
    copy:
      'Create a herd, then add animals with names, tags, birth dates, species, weights, notes, and photos. BarnBuddy is designed to work whether you have one animal or several herds.',
  },
  {
    title: '3. Track health records',
    copy:
      'Use animal profiles to record health events, vaccinations, vet visits, birth information, and follow-up dates. The dashboard surfaces what needs attention soon.',
  },
  {
    title: '4. Review upcoming care',
    copy:
      'Check dashboard summaries for vaccinations due, upcoming vet visits, and animals that may need attention. This keeps daily chores tied to clean records.',
  },
]

const roadmapDocs = [
  'Importing and exporting records',
  'School, FFA, and 4H workflows',
  'Premium reporting and analytics',
  'Mobile app guidance',
]

export default function Docs() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">Docs</p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">BarnBuddy documentation</h1>
              <p className="mt-4 text-white/78 text-lg leading-relaxed">
                A starter guide for using BarnBuddy. This can grow into a full documentation hub as more features are finalized.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <aside className="lg:col-span-4">
                <div className="sticky top-6 rounded-xl border border-white/10 bg-[#0f2650] p-6 shadow-xl shadow-black/20">
                  <h2 className="text-xl font-semibold">Docs plan</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/68">
                    Start with short, practical guides. Later, each item can become its own page with screenshots and examples.
                  </p>
                  <div className="mt-6 space-y-2">
                    {['Getting started', 'Animal profiles', 'Health records', 'Dashboard'].map((item) => (
                      <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`} className="block rounded-lg bg-white/6 px-4 py-3 text-sm text-white/78 hover:bg-white/10">
                        {item}
                      </a>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-8 space-y-5">
                {docSections.map((section) => (
                  <article
                    key={section.title}
                    id={section.title.split('. ')[1].toLowerCase().replaceAll(' ', '-')}
                    className="rounded-xl border border-white/10 bg-white/6 p-6 sm:p-8 shadow-xl shadow-black/15"
                  >
                    <h2 className="text-2xl font-semibold">{section.title}</h2>
                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/70">{section.copy}</p>
                  </article>
                ))}

                <section className="rounded-xl border border-white/10 bg-[#0f2650] p-6 sm:p-8">
                  <h2 className="text-2xl font-semibold">Future docs to add</h2>
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roadmapDocs.map((item) => (
                      <div key={item} className="rounded-lg border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/72">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

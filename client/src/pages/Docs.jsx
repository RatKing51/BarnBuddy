import React from 'react'
import Footer from '../components/Footer'

const tutorialSections = [
  {
    id: 'create-your-account',
    title: 'Create Your Account',
    intro: 'Start by creating and verifying your BarnBuddy account.',
    steps: [
      'Navigate to www.barnbuddy.pro.',
      'In the top right corner, click Sign Up.',
      'Fill in the requested account information.',
      'Check your email for the verification code.',
      'Enter the code to verify your account.',
      'After verification, you will be redirected to the main dashboard.',
    ],
    success: 'You have successfully made an account.',
  },
  {
    id: 'open-your-dashboard',
    title: 'Open Your Dashboard',
    intro: 'Use the dashboard as your main workspace after logging in.',
    steps: [
      'Navigate to www.barnbuddy.pro.',
      'If you are logged in, click the blue Dashboard button in the top right corner.',
      'If you are not logged in, go to the login page.',
      'After logging in, you will be redirected to the dashboard.',
    ],
    success: 'You have successfully opened your dashboard.',
  },
  {
    id: 'set-up-your-first-herd',
    title: 'Set Up Your First Herd',
    intro: 'BarnBuddy starts with a default herd, but you can create your own herds.',
    steps: [
      'Navigate to your dashboard.',
      'Click Settings in the top right corner.',
      'Click Herd Settings on the top left of the screen.',
      'Click the green + New Herd button.',
      'Enter a herd name. A description is optional.',
      'Click Save Changes to save the herd.',
      'Click Back to Dashboard.',
    ],
    success: 'You have successfully made a new herd.',
  },
  {
    id: 'add-your-first-animal',
    title: 'Add Your First Animal',
    intro: 'Animals are added from the dashboard into the herd you select.',
    steps: [
      'Navigate to your dashboard.',
      'Use the herd selector in the top left corner to choose the herd you want.',
      'Click Add.',
    ],
    success: 'You have successfully made your first animal.',
  },
  {
    id: 'track-health-records',
    title: 'Track Health Records',
    intro: 'Health records help you keep a clean history for each animal.',
    groups: [
      {
        label: 'Health Events',
        steps: [
          'Navigate to your dashboard.',
          'Select the animal you want to update.',
          'Click Health Records in the top center of the dashboard.',
          'Click + Add Event.',
          'Provide the correct information about the health event.',
        ],
        success: 'You have successfully made a new health event.',
      },
      {
        label: 'Vaccinations',
        steps: [
          'Navigate to the same Health Records tab.',
          'Click + Add Vaccination.',
          'Provide the correct information about the vaccination.',
        ],
        success: 'You have successfully made a new vaccination log.',
      },
    ],
  },
  {
    id: 'track-vet-visits',
    title: 'Track Vet Visits',
    intro: 'Vet visit logs help you record treatment and follow-up care.',
    steps: [
      'Navigate to your dashboard.',
      'Select the animal you want to update.',
      'Click Vet Visits in the top right center of the dashboard.',
      'Click + Add.',
      'Fill in visit date, vet name, reason, and treatment. These fields are required to save.',
    ],
    success: 'You have successfully made a new vet visit log.',
  },
  {
    id: 'view-farm-overview',
    title: 'View Farm Overview Dashboard',
    intro: 'The farm overview shows herd-wide information instead of one animal profile.',
    steps: [
      'Navigate to your dashboard.',
      'Click Farm Overview in the top left corner of the screen.',
    ],
    success: 'You have successfully navigated to the farm overview dashboard.',
  },
  {
    id: 'export-farm-data',
    title: 'Export Farm Data to PDF',
    intro: 'Export a simple PDF roster and care-status report for the selected herd.',
    steps: [
      'Navigate to your dashboard.',
      'Select the herd you would like to export data for.',
      'Click Export PDF in the top right corner.',
    ],
    success: 'You have successfully exported farm data to PDF.',
  },
]

function StepList({ steps }) {
  return (
    <ol className="mt-4 space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
            {index + 1}
          </span>
          <span className="pt-1 text-sm leading-relaxed text-white/76">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function SuccessNote({ children }) {
  return (
    <p className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-100">
      {children}
    </p>
  )
}

export default function Docs() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">Tutorial / Docs</p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">BarnBuddy Tutorial</h1>
              <p className="mt-4 text-white/78 text-lg leading-relaxed">
                A practical walkthrough for new users learning how to create an account, set up herds, add animals, track care, and export farm records.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <aside className="lg:col-span-4">
                <div className="sticky top-6 rounded-xl border border-white/10 bg-[#0f2650] p-6 shadow-xl shadow-black/20">
                  <h2 className="text-xl font-semibold">Contents</h2>
                  <p className="mt-3 text-sm leading-relaxed text-white/68">
                    Follow these guides in order if you are setting up BarnBuddy for the first time.
                  </p>
                  <div className="mt-6 space-y-2">
                    {tutorialSections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="block rounded-lg bg-white/6 px-4 py-3 text-sm text-white/78 hover:bg-white/10"
                      >
                        {section.title}
                      </a>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-8 space-y-5">
                {tutorialSections.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-8 rounded-xl border border-white/10 bg-white/6 p-6 sm:p-8 shadow-xl shadow-black/15"
                  >
                    <h2 className="text-2xl font-semibold">{section.title}</h2>
                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/70">{section.intro}</p>

                    {section.steps && <StepList steps={section.steps} />}

                    {section.groups && (
                      <div className="mt-5 space-y-5">
                        {section.groups.map((group) => (
                          <section key={group.label} className="rounded-lg border border-white/10 bg-[#0f2650] p-5">
                            <h3 className="text-lg font-semibold text-white">{group.label}</h3>
                            <StepList steps={group.steps} />
                            <SuccessNote>{group.success}</SuccessNote>
                          </section>
                        ))}
                      </div>
                    )}

                    {section.success && <SuccessNote>{section.success}</SuccessNote>}
                  </article>
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

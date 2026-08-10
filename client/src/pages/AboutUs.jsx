import { Link } from "react-router";
import Footer from "../components/Footer";
import { getSiteAssetUrl } from "../config/siteImages";

const principles = [
  {
    number: "01",
    title: "Practical by default",
    copy: "Every screen should help you finish a real farm task without digging through enterprise-level complexity.",
  },
  {
    number: "02",
    title: "Clear records, calmer days",
    copy: "Important dates and animal histories should be easy to find when you are in the barn, at a show, or talking with a vet.",
  },
  {
    number: "03",
    title: "Small operations matter",
    copy: "A project animal, a hobby herd, and a family farm all deserve tools made for the way they actually work.",
  },
];

const audiences = [
  ["Small family farms", "Keep herd details, animal histories, and care records together without adding office work."],
  ["FFA and 4-H members", "Build organized records for project animals, SAE work, activities, and finances."],
  ["Hobby livestock owners", "Replace scattered notes and spreadsheets with one dependable place to check the details."],
];

export default function About() {
  return (
    <div className="public-page flex min-h-screen flex-col text-white">
      <main className="flex-grow">
        <section className="relative overflow-hidden px-4 pb-14 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
          <div className="public-grid-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                  Our story
                </div>
                <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  Livestock record-keeping built from real farm experience.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                  BarnBuddy helps small farms, FFA and 4-H members, and hobby livestock owners keep animal care organized without enterprise complexity.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/signup"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-6 font-bold text-white shadow-xl shadow-blue-950/25 transition hover:bg-blue-500"
                  >
                    Start free
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 font-bold text-white transition hover:border-white/25 hover:bg-white/10"
                  >
                    Explore plans
                  </Link>
                </div>
                <div className="mt-8 flex flex-wrap gap-2" aria-label="BarnBuddy focus areas">
                  {["Built in Kansas", "Small-farm focused", "FFA and 4-H friendly"].map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <figure className="relative mx-auto w-full max-w-2xl">
                <div className="absolute -inset-5 rounded-[2.25rem] bg-blue-500/15 blur-3xl" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-[#0f2650] p-2 shadow-2xl shadow-black/35">
                  <img
                    src={getSiteAssetUrl("IMG_5761.JPEG")}
                    alt="BarnBuddy founder Gage Billinger at a Kansas FFA event"
                    className="aspect-[4/3] w-full rounded-[1.25rem] object-cover object-[center_38%] sm:aspect-[16/11] lg:aspect-[4/3]"
                  />
                  <figcaption className="flex flex-col gap-1 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <span className="font-bold text-white">Gage Billinger, founder</span>
                    <span className="text-sm text-slate-400">Kansas FFA member and livestock owner</span>
                  </figcaption>
                </div>
              </figure>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#07102a]/45 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Why BarnBuddy exists</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">A simpler answer to scattered records.</h2>
            </div>
            <div className="space-y-5 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              <p>
                BarnBuddy began on a small rural Kansas farm where Gage and his family raise meat goats. Health notes, important dates, and project records can quickly spread across notebooks, spreadsheets, and memory—especially when chores already fill the day.
              </p>
              <p>
                Gage built BarnBuddy to bring those details together in a system that feels approachable from the first animal onward. The goal is straightforward: help smaller livestock operations stay organized, make confident care decisions, and spend less time wrestling with paperwork.
              </p>
              <blockquote className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-5 font-semibold leading-7 text-blue-50 sm:p-6">
                “Useful farm software should fit the work—not make the work fit the software.”
              </blockquote>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">What guides us</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Professional tools can still feel personal.</h2>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                BarnBuddy is shaped around three principles that keep the product focused as it grows.
              </p>
            </div>

            <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
              {principles.map((principle) => (
                <article key={principle.number} className="bb-card-lift rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 sm:p-7">
                  <p className="text-sm font-black text-blue-300">{principle.number}</p>
                  <h3 className="mt-5 text-xl font-bold text-white">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{principle.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/10 bg-[#0f2650] shadow-2xl shadow-black/20">
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Made for the smaller operation</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.03em]">The right amount of software.</h2>
                <p className="mt-4 leading-7 text-slate-300">
                  Start with core record-keeping and add deeper tools when your operation or project needs them.
                </p>
              </div>
              <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {audiences.map(([title, copy]) => (
                  <article key={title} className="p-6 sm:p-7">
                    <h3 className="font-bold text-white">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-600 to-blue-800 p-7 shadow-2xl shadow-blue-950/30 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Ready when you are</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Keep better records without making chores harder.</h2>
              <p className="mt-3 leading-7 text-blue-50/85">Create your first herd for free, then build a system that grows with your animals.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link to="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 font-bold text-blue-800 transition hover:bg-blue-50">
                Create an account
              </Link>
              <Link to="/help" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 font-bold text-white transition hover:bg-white/15">
                Visit Help Center
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

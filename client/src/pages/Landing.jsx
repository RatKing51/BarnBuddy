import { useEffect, useState } from "react";
import { Link } from "react-router";
import LargeLandingCard from "../components/LargeLandingCard";
import ReviewLandingCard from "../components/ReviewLandingCard";
import LargeAboutMeLanding from "../components/LargeAboutMeLanding";
import RecentNewsCard from "../components/RecentNewsCard";
import Footer from "../components/Footer";
import { newsPosts } from "../data/newsPosts";
import { landingReviews } from "../data/reviews";
import { getSiteContent } from "../api/siteContent";
import { defaultSiteContent } from "../data/siteContent";

const featureCards = [
  {
    eyebrow: "Animal records",
    title: "The full story, attached to the animal.",
    copy: "Keep identification, notes, weights, health history, vaccinations, and vet visits organized in one profile.",
  },
  {
    eyebrow: "Herd organization",
    title: "A clear view across every herd.",
    copy: "Group animals the way your operation works and move between herd-level details without losing context.",
  },
  {
    eyebrow: "Care visibility",
    title: "Know what needs attention next.",
    copy: "See due and overdue care in the dashboard so important follow-ups are easier to catch before they slip by.",
  },
  {
    eyebrow: "Useful reporting",
    title: "Records ready when decisions matter.",
    copy: "Turn day-to-day entries into practical histories and exports for the farm, the vet, or an FFA project.",
  },
];

const workflowSteps = [
  ["1", "Record", "Add the details while they are fresh—from the barn, show ring, or kitchen table."],
  ["2", "Review", "Open a herd or animal and quickly understand its history and current care status."],
  ["3", "Act", "Use clear dates and organized records to plan the next task with more confidence."],
];

export default function Landing() {
  const [reviews, setReviews] = useState(landingReviews);
  const [posts, setPosts] = useState(newsPosts);
  const [carouselSlides, setCarouselSlides] = useState(defaultSiteContent.carouselSlides);
  const recentPosts = posts.filter((post) => post.published !== false).slice(0, 2);

  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      try {
        const content = await getSiteContent();
        if (!cancelled) {
          setReviews(Array.isArray(content.reviews) ? content.reviews : defaultSiteContent.reviews);
          setPosts(Array.isArray(content.newsPosts) ? content.newsPosts : defaultSiteContent.newsPosts);
          setCarouselSlides(Array.isArray(content.carouselSlides) ? content.carouselSlides : defaultSiteContent.carouselSlides);
        }
      } catch (error) {
        console.warn("Using bundled landing content:", error.message);
      }
    }

    loadContent();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="public-page flex min-h-screen flex-col">
      <main className="flex-grow">
        <LargeLandingCard slides={carouselSlides} />

        <section id="features" className="scroll-mt-24 border-y border-white/10 bg-[#07102a]/45 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">One place for the work that matters</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">Built around livestock, not spreadsheets.</h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 lg:justify-self-end">
                BarnBuddy turns everyday entries into an organized record of each animal and herd, while keeping the workflow simple enough to use consistently.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
              {featureCards.map((feature, index) => (
                <article key={feature.eyebrow} className="bb-card-lift group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">{feature.eyebrow}</p>
                    <span className="text-sm font-black text-white/20 transition group-hover:text-blue-300">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-white sm:text-2xl">{feature.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">{feature.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-[#0f2650] p-6 shadow-2xl shadow-black/20 sm:p-9 lg:p-10">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">From note to next step</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">A workflow you can remember without a manual.</h2>
            </div>
            <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">
              {workflowSteps.map(([number, title, copy]) => (
                <article key={number} className="rounded-2xl border border-white/10 bg-[#0b1730]/75 p-5 sm:p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-sm font-black text-white">{number}</span>
                  <h3 className="mt-5 text-xl font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {reviews.length > 0 && (
          <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">From BarnBuddy users</p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">Made useful by real feedback.</h2>
                </div>
                <Link to="/contact?topic=Review%20or%20feedback" className="inline-flex min-h-11 items-center font-bold text-blue-200 hover:text-blue-100">
                  Share your experience →
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                {reviews.map((review) => (
                  <ReviewLandingCard key={review.id || `${review.name}-${review.date}`} {...review} />
                ))}
              </div>
            </div>
          </section>
        )}

        <LargeAboutMeLanding />

        <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">From the barn</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">Product news and practical updates.</h2>
              </div>
              <Link to="/news" className="inline-flex min-h-11 items-center font-bold text-blue-200 hover:text-blue-100">
                View all news →
              </Link>
            </div>

            {recentPosts.length > 0 ? (
              <div className="mt-8 space-y-5">
                {recentPosts.map((post) => (
                  <RecentNewsCard
                    key={post.id}
                    title={post.title}
                    excerpt={post.excerpt}
                    date={post.date}
                    image={post.image}
                    imageAlt={post.imageAlt}
                    imageFit={post.imageFit}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center sm:p-10">
                <p className="text-xl font-bold text-white">The next update is in the works.</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-300">Check back for product notes and practical record-keeping ideas from BarnBuddy.</p>
              </div>
            )}
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 rounded-3xl border border-blue-300/20 bg-gradient-to-br from-blue-600 to-blue-800 p-7 shadow-2xl shadow-blue-950/30 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Doing for the Small</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">Give every animal a record you can rely on.</h2>
              <p className="mt-3 leading-7 text-blue-50/85">Start with the core tools for free and build better record-keeping habits one entry at a time.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link to="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 font-bold text-blue-800 transition hover:bg-blue-50">
                Create a free account
              </Link>
              <Link to="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 font-bold text-white transition hover:bg-white/15">
                Compare plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

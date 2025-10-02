import React from 'react'
import LargeLandingCard from '../components/LargeLandingCard'
import ReviewLandingCard from '../components/ReviewLandingCard'
import LargeAboutMeLanding from '../components/LargeAboutMeLanding'
import RecentNewsCard from '../components/RecentNewsCard'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <div className='bg-[#101D42]'>
        <LargeLandingCard />
        <div className='flex flex-row justify-evenly'>
            <ReviewLandingCard />
            <ReviewLandingCard />
            <ReviewLandingCard />
        </div>
        <div>
            <LargeAboutMeLanding />
        </div>
        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Label row */}
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-white text-3xl sm:text-4xl font-bold">Recent News</h2>
              <p className="text-white/70 text-sm">Latest updates and announcements</p>
            </div>

            {/* Cards list — increase vertical spacing to make them feel larger */}
            <div className="space-y-6">
              <RecentNewsCard
                title="BarnBuddy launches smarter record-keeping"
                excerpt="A concise breakdown of the new features and why small farms can get started in minutes with improved workflows."
              />
              <RecentNewsCard
                title="New guide: Simplifying livestock tracking"
                excerpt="Step-by-step tips for small farms to keep clean, useful records without introducing extra overhead."
              />
            </div>
          </div>
        </section>
        <div>
          <Footer />
        </div>
    </div>
  )
}

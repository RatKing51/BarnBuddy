import React from 'react'
import LargeLandingCard from '../components/LargeLandingCard'
import ReviewLandingCard from '../components/ReviewLandingCard'
import LargeAboutMeLanding from '../components/LargeAboutMeLanding'
import RecentNewsCard from '../components/RecentNewsCard'
import Footer from '../components/Footer'
import { newsPosts } from '../data/newsPosts'
import { landingReviews } from '../data/reviews'

export default function Landing() {
  const recentPosts = newsPosts.slice(0, 2)

  return (
    <div className='bg-[#101D42]'>
        <LargeLandingCard />
        <section className="bg-[#101D42] px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Reviews</p>
                <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Trusted by small livestock owners</h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-white/68">
                Practical feedback from students, families, and small farms using BarnBuddy to keep better records.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {landingReviews.map((review) => (
                <ReviewLandingCard key={`${review.name}-${review.date}`} {...review} />
              ))}
            </div>
          </div>
        </section>
        <div>
            <LargeAboutMeLanding />
        </div>
        <section className="py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="text-white text-3xl sm:text-4xl font-bold">Recent News</h2>
              <p className="text-white/70 text-sm">Latest updates and announcements</p>
            </div>

            <div className="space-y-6">
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
          </div>
        </section>
        <div>
          <Footer />
        </div>
    </div>
  )
}

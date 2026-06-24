import React, { useEffect, useState } from 'react'
import LargeLandingCard from '../components/LargeLandingCard'
import ReviewLandingCard from '../components/ReviewLandingCard'
import LargeAboutMeLanding from '../components/LargeAboutMeLanding'
import RecentNewsCard from '../components/RecentNewsCard'
import Footer from '../components/Footer'
import { newsPosts } from '../data/newsPosts'
import { landingReviews } from '../data/reviews'
import { getSiteContent } from '../api/siteContent'
import { defaultSiteContent } from '../data/siteContent'

export default function Landing() {
  const [reviews, setReviews] = useState(landingReviews)
  const [posts, setPosts] = useState(newsPosts)
  const [carouselSlides, setCarouselSlides] = useState(defaultSiteContent.carouselSlides)
  const [branding, setBranding] = useState(defaultSiteContent.branding)
  const recentPosts = posts.slice(0, 2)

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      try {
        const content = await getSiteContent()
        if (!cancelled) {
          setReviews(Array.isArray(content.reviews) ? content.reviews : defaultSiteContent.reviews)
          setPosts(Array.isArray(content.newsPosts) ? content.newsPosts : defaultSiteContent.newsPosts)
          setCarouselSlides(Array.isArray(content.carouselSlides) ? content.carouselSlides : defaultSiteContent.carouselSlides)
          setBranding({ ...defaultSiteContent.branding, ...(content.branding || {}) })
        }
      } catch (err) {
        console.warn('Using bundled landing content:', err.message)
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className='bg-[#101D42]'>
        <LargeLandingCard slides={carouselSlides} branding={branding} />
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

            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {reviews.map((review) => (
                  <ReviewLandingCard key={review.id || `${review.name}-${review.date}`} {...review} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/16 bg-white/6 p-8 text-center">
                <h3 className="text-lg font-semibold text-white">No reviews yet</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/68">
                  BarnBuddy is still gathering feedback from small farms and livestock owners.
                </p>
              </div>
            )}
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

import React, { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import { getSiteContent } from '../api/siteContent'
import { defaultSiteContent } from '../data/siteContent'

export default function News() {
  const [posts, setPosts] = useState(defaultSiteContent.newsPosts)

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      try {
        const data = await getSiteContent()
        if (!cancelled && Array.isArray(data.newsPosts)) {
          setPosts(data.newsPosts)
        }
      } catch (err) {
        console.warn('Using bundled news content:', err.message)
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [])

  const newsPosts = posts.filter((post) => post.published !== false)
  const featuredPost = newsPosts.find((post) => post.featured) || newsPosts[0]
  const otherPosts = featuredPost ? newsPosts.filter((post) => post.id !== featuredPost.id) : []
  const formatDate = (date) =>
    new Intl.DateTimeFormat('en', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`))

  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <p className="text-blue-300 text-sm font-semibold uppercase tracking-[0.18em]">BarnBuddy News</p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">Updates from the barn</h1>
              <p className="mt-4 text-white/78 text-lg leading-relaxed">
                Product notes, launch updates, and small-farm record-keeping ideas from the BarnBuddy team.
              </p>
            </div>

            {featuredPost && (
              <article className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-12">
                <div className="lg:col-span-7 min-h-80 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.imageAlt}
                    className={`h-full min-h-80 w-full ${featuredPost.imageFit === 'contain' ? 'object-contain p-8' : 'object-cover'}`}
                  />
                </div>

                <div className="lg:col-span-5 bg-[#0f2650] border border-white/8 rounded-lg p-7 sm:p-8 shadow-lg flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                    <span className="bg-blue-500/18 text-blue-200 border border-blue-300/20 px-3 py-1 rounded-full">
                      {featuredPost.category}
                    </span>
                    <time dateTime={featuredPost.date}>{formatDate(featuredPost.date)}</time>
                  </div>
                  <h2 className="mt-5 text-3xl font-semibold leading-tight">{featuredPost.title}</h2>
                  <p className="mt-4 text-white/84 leading-relaxed">{featuredPost.excerpt}</p>
                  <p className="mt-4 text-white/72 leading-relaxed">{featuredPost.body}</p>
                </div>
              </article>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {otherPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white/6 border border-white/8 rounded-lg overflow-hidden shadow-lg flex flex-col"
                >
                  <div className="aspect-[16/10] bg-[#101D42]">
                    <img
                      src={post.image}
                      alt={post.imageAlt}
                      className={`h-full w-full ${post.imageFit === 'contain' ? 'object-contain p-6' : 'object-cover'}`}
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/65">
                      <span className="text-blue-200 font-semibold">{post.category}</span>
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold leading-snug">{post.title}</h3>
                    <p className="mt-3 text-sm text-white/78 leading-relaxed">{post.excerpt}</p>
                    <p className="mt-4 text-sm text-white/62 leading-relaxed">{post.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Footer from '../components/Footer'
import { getSiteContent } from '../api/siteContent'
import { defaultSiteContent } from '../data/siteContent'
import { resolveSiteImageUrl } from '../config/siteImages'

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
    <div className="public-page flex min-h-screen flex-col text-white">
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

            {newsPosts.length === 0 ? (
              <section className="rounded-2xl border border-dashed border-white/16 bg-white/6 px-5 py-12 text-center shadow-xl shadow-black/15 sm:px-8 sm:py-16">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-950/30" aria-hidden="true">
                  BB.
                </div>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Newsroom</p>
                <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">New updates are on the way</h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/68 sm:text-base">
                  Product notes and practical record-keeping ideas will appear here as soon as they are published.
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
                    Explore BarnBuddy
                  </Link>
                  <Link to="/contact" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/14 bg-white/6 px-5 py-3 font-semibold text-white hover:bg-white/10">
                    Contact BarnBuddy
                  </Link>
                </div>
              </section>
            ) : (
              <>
                {featuredPost && (
                  <article className="mb-12 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
                    <div className="min-h-80 overflow-hidden rounded-lg border border-white/10 bg-white/5 lg:col-span-7">
                      <img
                        src={resolveSiteImageUrl(featuredPost.image)}
                        alt={featuredPost.imageAlt}
                        className={`h-full min-h-80 w-full ${featuredPost.imageFit === 'contain' ? 'object-contain p-8' : 'object-cover'}`}
                      />
                    </div>

                    <div className="flex flex-col justify-center rounded-lg border border-white/8 bg-[#0f2650] p-7 shadow-lg sm:p-8 lg:col-span-5">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                        <span className="rounded-full border border-blue-300/20 bg-blue-500/18 px-3 py-1 text-blue-200">
                          {featuredPost.category}
                        </span>
                        <time dateTime={featuredPost.date}>{formatDate(featuredPost.date)}</time>
                      </div>
                      <h2 className="mt-5 text-3xl font-semibold leading-tight">{featuredPost.title}</h2>
                      <p className="mt-4 leading-relaxed text-white/84">{featuredPost.excerpt}</p>
                      <p className="mt-4 leading-relaxed text-white/72">{featuredPost.body}</p>
                    </div>
                  </article>
                )}

                {otherPosts.length > 0 && (
                  <section aria-labelledby="more-news-heading">
                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <h2 id="more-news-heading" className="text-2xl font-semibold sm:text-3xl">More updates</h2>
                      <p className="text-sm text-white/60">Product news and practical notes from BarnBuddy</p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {otherPosts.map((post) => (
                        <article
                          key={post.id}
                          className="flex flex-col overflow-hidden rounded-lg border border-white/8 bg-white/6 shadow-lg"
                        >
                          <div className="aspect-[16/10] bg-[#101D42]">
                            <img
                              src={resolveSiteImageUrl(post.image)}
                              alt={post.imageAlt}
                              className={`h-full w-full ${post.imageFit === 'contain' ? 'object-contain p-6' : 'object-cover'}`}
                            />
                          </div>
                          <div className="flex flex-1 flex-col p-6">
                            <div className="flex flex-wrap items-center gap-3 text-xs text-white/65">
                              <span className="font-semibold text-blue-200">{post.category}</span>
                              <time dateTime={post.date}>{formatDate(post.date)}</time>
                            </div>
                            <h3 className="mt-4 text-xl font-semibold leading-snug">{post.title}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-white/78">{post.excerpt}</p>
                            {post.body && (
                              <details className="group mt-5 border-t border-white/10 pt-4">
                                <summary className="cursor-pointer list-none text-sm font-semibold text-blue-200 marker:hidden hover:text-white">
                                  <span className="group-open:hidden">Read the full update</span>
                                  <span className="hidden group-open:inline">Hide full update</span>
                                </summary>
                                <p className="mt-3 text-sm leading-relaxed text-white/65">{post.body}</p>
                              </details>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

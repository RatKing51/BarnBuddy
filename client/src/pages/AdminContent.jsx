import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { API_BASE_URL, API_URL } from '../config/env'
import { useAuth } from '../context/AuthContext'
import { defaultSiteContent } from '../data/siteContent'

const blankPost = {
  id: '',
  title: '',
  date: new Date().toISOString().slice(0, 10),
  category: 'Updates',
  excerpt: '',
  body: '',
  image: '/bblogo.png',
  imageAlt: 'BarnBuddy logo',
  imageFit: 'cover',
  featured: false,
  published: true,
}

const blankService = {
  name: '',
  status: 'Operational',
  tone: 'green',
}

const toneOptions = [
  ['green', 'Operational'],
  ['blue', 'Notice'],
  ['yellow', 'Degraded'],
  ['red', 'Outage'],
]

const toneClasses = {
  green: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  blue: 'border-sky-300/25 bg-sky-400/10 text-sky-100',
  yellow: 'border-amber-300/25 bg-amber-400/10 text-amber-100',
  red: 'border-red-300/25 bg-red-400/10 text-red-100',
}

const dotClasses = {
  green: 'bg-emerald-300',
  blue: 'bg-sky-300',
  yellow: 'bg-amber-300',
  red: 'bg-red-300',
}

function Field({ label, children, span = '' }) {
  return (
    <label className={`block ${span}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}

function inputClass(extra = '') {
  return `w-full rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-300 ${extra}`
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function formatDate(date) {
  if (!date) return 'No date'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function EmptyState({ title, text, action }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/35 p-8 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">{text}</p>
      {action}
    </div>
  )
}

export default function AdminContent() {
  const { authFetch } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [content, setContent] = useState(defaultSiteContent)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [notAuthenticated, setNotAuthenticated] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadContent() {
      try {
        const res = await authFetch(`${API_BASE_URL}/site-content/admin`)
        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          const error = new Error(data.error || data.message || 'Failed to load admin content.')
          error.status = res.status
          throw error
        }

        if (!cancelled) {
          setContent({
            newsPosts: Array.isArray(data.newsPosts) ? data.newsPosts : defaultSiteContent.newsPosts,
            status: { ...defaultSiteContent.status, ...(data.status || {}) },
          })
        }
      } catch (err) {
        if (err.status === 401) {
          setNotAuthenticated(true)
        } else if (err.status === 403) {
          setAccessDenied(true)
        } else {
          setLoadError(err.message || 'Failed to load admin content.')
          toast.error(err.message || 'Failed to load admin content.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadContent()

    return () => {
      cancelled = true
    }
  }, [authFetch])

  useEffect(() => {
    if (selectedPostIndex > content.newsPosts.length - 1) {
      setSelectedPostIndex(Math.max(content.newsPosts.length - 1, 0))
    }
  }, [content.newsPosts.length, selectedPostIndex])

  const dashboardStats = useMemo(() => {
    const publishedPosts = content.newsPosts.filter((post) => post.published !== false).length
    const draftPosts = content.newsPosts.length - publishedPosts
    const flaggedServices = (content.status.services || []).filter((service) =>
      ['yellow', 'red'].includes(service.tone)
    ).length

    return [
      { label: 'Published posts', value: publishedPosts },
      { label: 'Draft posts', value: draftPosts },
      { label: 'Services', value: content.status.services?.length || 0 },
      { label: 'Needs attention', value: flaggedServices },
    ]
  }, [content])

  const selectedPost = content.newsPosts[selectedPostIndex] || null
  const featuredPostId = content.newsPosts.find((post) => post.featured)?.id || ''

  function updatePost(index, changes) {
    setContent((current) => {
      const newsPosts = current.newsPosts.map((post, postIndex) => {
        if (postIndex !== index) return post
        const nextPost = { ...post, ...changes }
        if ('title' in changes && !post.id) nextPost.id = slugify(changes.title)
        return nextPost
      })

      return { ...current, newsPosts }
    })
  }

  function addPost() {
    setContent((current) => ({
      ...current,
      newsPosts: [{ ...blankPost, id: `post-${Date.now()}` }, ...current.newsPosts],
    }))
    setSelectedPostIndex(0)
    setActiveTab('news')
  }

  function removePost(index) {
    setContent((current) => ({
      ...current,
      newsPosts: current.newsPosts.filter((_, postIndex) => postIndex !== index),
    }))
    setSelectedPostIndex((current) => Math.max(current - 1, 0))
  }

  function setFeaturedPost(index) {
    setContent((current) => ({
      ...current,
      newsPosts: current.newsPosts.map((post, postIndex) => ({
        ...post,
        featured: postIndex === index,
      })),
    }))
  }

  function updateStatus(changes) {
    setContent((current) => ({
      ...current,
      status: { ...current.status, ...changes },
    }))
  }

  function updateService(index, changes) {
    setContent((current) => ({
      ...current,
      status: {
        ...current.status,
        services: current.status.services.map((service, serviceIndex) =>
          serviceIndex === index ? { ...service, ...changes } : service
        ),
      },
    }))
  }

  function addService() {
    setContent((current) => ({
      ...current,
      status: {
        ...current.status,
        services: [...current.status.services, { ...blankService }],
      },
    }))
  }

  function removeService(index) {
    setContent((current) => ({
      ...current,
      status: {
        ...current.status,
        services: current.status.services.filter((_, serviceIndex) => serviceIndex !== index),
      },
    }))
  }

  async function saveContent() {
    try {
      setSaving(true)
      const res = await authFetch(`${API_BASE_URL}/site-content/admin`, {
        method: 'PUT',
        body: JSON.stringify(content),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to save website content.')
      }

      setContent({
        newsPosts: Array.isArray(data.newsPosts) ? data.newsPosts : content.newsPosts,
        status: { ...content.status, ...(data.status || {}) },
      })
      toast.success('Website content saved.')
    } catch (err) {
      toast.error(err.message || 'Failed to save website content.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadPostImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !selectedPost) return

    if (!file.type.startsWith('image/')) {
      toast.error('Upload a JPG, PNG, WebP, or another image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Max size is 5MB.')
      return
    }

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('image', file)

      const res = await authFetch(`${API_BASE_URL}/site-content/admin/media`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to upload image.')
      }

      updatePost(selectedPostIndex, {
        image: data.url?.startsWith('/api/') ? `${API_URL}${data.url}` : data.url,
        imageAlt: selectedPost.imageAlt || selectedPost.title || file.name,
        imageFit: selectedPost.imageFit || 'cover',
      })
      toast.success('Image uploaded. Save changes to publish it.')
    } catch (err) {
      toast.error(err.message || 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="rounded-lg border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-300">
          Loading admin dashboard...
        </div>
      </main>
    )
  }

  if (accessDenied) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="max-w-md rounded-lg border border-red-300/20 bg-red-950/35 p-6 text-center">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <p className="mt-3 text-sm leading-relaxed text-red-100/80">
            This account is signed in, but it is not on the admin allowlist.
          </p>
        </div>
      </main>
    )
  }

  if (notAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="max-w-md rounded-lg border border-amber-300/20 bg-amber-950/30 p-6 text-center">
          <h1 className="text-2xl font-semibold">Sign in required</h1>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
            The admin page opened, but the API did not receive a Clerk session token. Sign in from this same frontend
            localhost URL, then come back to /admin.
          </p>
          <a
            href="/login"
            className="mt-5 inline-flex rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
          >
            Go to login
          </a>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <div className="max-w-md rounded-lg border border-red-300/20 bg-red-950/35 p-6 text-center">
          <h1 className="text-2xl font-semibold">Admin failed to load</h1>
          <p className="mt-3 text-sm leading-relaxed text-red-100/80">{loadError}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[16rem_1fr]">
        <aside className="border-b border-slate-800 bg-slate-900/90 px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">BarnBuddy</p>
              <h1 className="mt-1 text-xl font-semibold">Admin</h1>
            </div>
            <button
              type="button"
              onClick={saveContent}
              disabled={saving}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 lg:hidden"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <nav className="mt-5 grid grid-cols-3 gap-2 lg:grid-cols-1">
            {[
              ['overview', 'Overview'],
              ['news', 'News'],
              ['status', 'Status'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                  activeTab === id
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 hidden rounded-lg border border-slate-800 bg-slate-950/55 p-4 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current status</p>
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses[content.status.overallTone] || toneClasses.green}`}>
              <span className={`h-2 w-2 rounded-full ${dotClasses[content.status.overallTone] || dotClasses.green}`} />
              {content.status.overallStatus || 'Operational'}
            </div>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Website content</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight">Manage updates, posts, and service status</h2>
            </div>
            <div className="hidden gap-3 lg:flex">
              <a
                href="/news"
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                View news
              </a>
              <a
                href="/status"
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                View status
              </a>
              <button
                type="button"
                onClick={saveContent}
                disabled={saving}
                className="rounded-md bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </header>

          {activeTab === 'overview' && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {dashboardStats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{stat.label}</p>
                    <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-lg border border-slate-800 bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                    <div>
                      <h3 className="font-semibold">Recent news</h3>
                      <p className="mt-1 text-sm text-slate-400">Newest content at a glance.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addPost}
                      className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                    >
                      Add post
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {content.newsPosts.slice(0, 5).map((post, index) => (
                      <button
                        key={post.id || index}
                        type="button"
                        onClick={() => {
                          setSelectedPostIndex(index)
                          setActiveTab('news')
                        }}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-800/55"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{post.title || 'Untitled post'}</p>
                          <p className="mt-1 text-sm text-slate-400">{post.category || 'Updates'} · {formatDate(post.date)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${post.published === false ? 'border-amber-300/25 bg-amber-400/10 text-amber-100' : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'}`}>
                          {post.published === false ? 'Draft' : 'Live'}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                  <h3 className="font-semibold">Status summary</h3>
                  <p className="mt-3 text-2xl font-semibold">{content.status.headline}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{content.status.summary}</p>
                  <div className="mt-5 space-y-2">
                    {(content.status.services || []).slice(0, 4).map((service, index) => (
                      <div key={`${service.name}-${index}`} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/45 px-3 py-2">
                        <span className="text-sm font-semibold">{service.name}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-300">
                          <span className={`h-2 w-2 rounded-full ${dotClasses[service.tone] || dotClasses.green}`} />
                          {service.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[24rem_1fr]">
              <section className="rounded-lg border border-slate-800 bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                  <div>
                    <h3 className="font-semibold">News posts</h3>
                    <p className="mt-1 text-sm text-slate-400">{content.newsPosts.length} total posts</p>
                  </div>
                  <button
                    type="button"
                    onClick={addPost}
                    className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                  >
                    Add
                  </button>
                </div>

                <div className="max-h-[42rem] overflow-y-auto p-2">
                  {content.newsPosts.length === 0 ? (
                    <EmptyState title="No posts yet" text="Create the first news update for the public website." />
                  ) : (
                    content.newsPosts.map((post, index) => (
                      <button
                        key={post.id || index}
                        type="button"
                        onClick={() => setSelectedPostIndex(index)}
                        className={`mb-2 w-full rounded-md border p-3 text-left transition ${
                          selectedPostIndex === index
                            ? 'border-sky-300 bg-sky-500/12'
                            : 'border-slate-800 bg-slate-950/35 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{post.title || 'Untitled post'}</p>
                            <p className="mt-1 text-xs text-slate-400">{formatDate(post.date)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${post.published === false ? 'border-amber-300/25 bg-amber-400/10 text-amber-100' : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'}`}>
                            {post.published === false ? 'Draft' : 'Live'}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{post.excerpt || 'No excerpt yet.'}</p>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900">
                {selectedPost ? (
                  <>
                    <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-semibold">{selectedPost.title || 'Untitled post'}</h3>
                        <p className="mt-1 text-sm text-slate-400">{selectedPost.category || 'Updates'} · {formatDate(selectedPost.date)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setFeaturedPost(selectedPostIndex)}
                          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                            featuredPostId === selectedPost.id
                              ? 'border-sky-300 bg-sky-500/15 text-sky-100'
                              : 'border-slate-700 bg-slate-950/40 text-slate-300'
                          }`}
                        >
                          Featured
                        </button>
                        <button
                          type="button"
                          onClick={() => updatePost(selectedPostIndex, { published: selectedPost.published === false })}
                          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                            selectedPost.published === false
                              ? 'border-amber-300/25 bg-amber-400/10 text-amber-100'
                              : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
                          }`}
                        >
                          {selectedPost.published === false ? 'Draft' : 'Published'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removePost(selectedPostIndex)}
                          className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 p-5 2xl:grid-cols-[1fr_22rem]">
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Field label="Title" span="md:col-span-2">
                            <input className={inputClass()} value={selectedPost.title} onChange={(event) => updatePost(selectedPostIndex, { title: event.target.value })} />
                          </Field>
                          <Field label="Date">
                            <input type="date" className={inputClass()} value={selectedPost.date} onChange={(event) => updatePost(selectedPostIndex, { date: event.target.value })} />
                          </Field>
                          <Field label="Category">
                            <input className={inputClass()} value={selectedPost.category} onChange={(event) => updatePost(selectedPostIndex, { category: event.target.value })} />
                          </Field>
                          <Field label="Excerpt" span="md:col-span-2">
                            <textarea className={inputClass('min-h-28 resize-y')} value={selectedPost.excerpt} onChange={(event) => updatePost(selectedPostIndex, { excerpt: event.target.value })} />
                          </Field>
                          <Field label="Body" span="md:col-span-2">
                            <textarea className={inputClass('min-h-44 resize-y')} value={selectedPost.body} onChange={(event) => updatePost(selectedPostIndex, { body: event.target.value })} />
                          </Field>
                        </div>
                      </div>

                      <aside className="rounded-lg border border-slate-800 bg-slate-950/45 p-4">
                        <h4 className="font-semibold">Preview</h4>
                        <div className="mt-4 overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                          <div className="aspect-[16/10] bg-slate-900">
                            <img
                              src={selectedPost.image || '/bblogo.png'}
                              alt={selectedPost.imageAlt || selectedPost.title || 'News image'}
                              className={`h-full w-full ${selectedPost.imageFit === 'contain' ? 'object-contain p-5' : 'object-cover'}`}
                            />
                          </div>
                          <div className="p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">{selectedPost.category || 'Updates'}</p>
                            <p className="mt-2 text-lg font-semibold leading-snug">{selectedPost.title || 'Untitled post'}</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">{selectedPost.excerpt || 'Excerpt preview will appear here.'}</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-4">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Upload image</span>
                            <label className="mt-2 flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950/55 px-3 py-4 text-center text-sm font-semibold text-slate-200 transition hover:border-sky-300 hover:text-white">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={uploadPostImage}
                                disabled={uploadingImage}
                              />
                              {uploadingImage ? 'Uploading...' : 'Choose image'}
                            </label>
                            <p className="mt-2 text-xs text-slate-500">Max 5MB. Uploading fills the image URL below.</p>
                          </div>
                          <Field label="Image URL">
                            <input className={inputClass()} value={selectedPost.image} onChange={(event) => updatePost(selectedPostIndex, { image: event.target.value })} />
                          </Field>
                          <Field label="Image alt text">
                            <input className={inputClass()} value={selectedPost.imageAlt} onChange={(event) => updatePost(selectedPostIndex, { imageAlt: event.target.value })} />
                          </Field>
                          <Field label="Image fit">
                            <select className={inputClass()} value={selectedPost.imageFit} onChange={(event) => updatePost(selectedPostIndex, { imageFit: event.target.value })}>
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                            </select>
                          </Field>
                        </div>
                      </aside>
                    </div>
                  </>
                ) : (
                  <div className="p-5">
                    <EmptyState
                      title="Select or add a post"
                      text="Choose a post from the list or create a new one to start editing."
                      action={
                        <button type="button" onClick={addPost} className="mt-5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                          Add post
                        </button>
                      }
                    />
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_24rem]">
              <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Status page</h3>
                    <p className="mt-1 text-sm text-slate-400">Update the public service status in one place.</p>
                  </div>
                  <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses[content.status.overallTone] || toneClasses.green}`}>
                    <span className={`h-2 w-2 rounded-full ${dotClasses[content.status.overallTone] || dotClasses.green}`} />
                    {content.status.overallStatus || 'Operational'}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Headline">
                    <input className={inputClass()} value={content.status.headline} onChange={(event) => updateStatus({ headline: event.target.value })} />
                  </Field>
                  <Field label="Overall label">
                    <input className={inputClass()} value={content.status.overallStatus} onChange={(event) => updateStatus({ overallStatus: event.target.value })} />
                  </Field>
                  <Field label="Summary" span="md:col-span-2">
                    <textarea className={inputClass('min-h-28 resize-y')} value={content.status.summary} onChange={(event) => updateStatus({ summary: event.target.value })} />
                  </Field>
                  <Field label="Overall tone">
                    <select className={inputClass()} value={content.status.overallTone} onChange={(event) => updateStatus({ overallTone: event.target.value })}>
                      {toneOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Services</h4>
                    <p className="mt-1 text-sm text-slate-400">Each row appears on the public status page.</p>
                  </div>
                  <button type="button" onClick={addService} className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                    Add service
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {(content.status.services || []).map((service, index) => (
                    <div key={`${service.name}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-800 bg-slate-950/45 p-4 lg:grid-cols-[1fr_1fr_11rem_auto]">
                      <input className={inputClass()} value={service.name} onChange={(event) => updateService(index, { name: event.target.value })} placeholder="Service" />
                      <input className={inputClass()} value={service.status} onChange={(event) => updateService(index, { status: event.target.value })} placeholder="Status" />
                      <select className={inputClass()} value={service.tone} onChange={(event) => updateService(index, { tone: event.target.value })}>
                        {toneOptions.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeService(index)} className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <h3 className="font-semibold">Public preview</h3>
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Status</p>
                  <h4 className="mt-3 text-2xl font-semibold leading-tight">{content.status.headline}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{content.status.summary}</p>
                  <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses[content.status.overallTone] || toneClasses.green}`}>
                    <span className={`h-2 w-2 rounded-full ${dotClasses[content.status.overallTone] || dotClasses.green}`} />
                    {content.status.overallStatus}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <Field label="Update title">
                    <input className={inputClass()} value={content.status.recentUpdateTitle} onChange={(event) => updateStatus({ recentUpdateTitle: event.target.value })} />
                  </Field>
                  <Field label="Update body">
                    <textarea className={inputClass('min-h-32 resize-y')} value={content.status.recentUpdateBody} onChange={(event) => updateStatus({ recentUpdateBody: event.target.value })} />
                  </Field>
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

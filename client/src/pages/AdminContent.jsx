import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { API_BASE_URL, API_URL } from '../config/env'
import { useAuth } from '../context/AuthContext'
import ReviewLandingCard from '../components/ReviewLandingCard'
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

const blankReview = {
  name: '',
  role: '',
  rating: 5,
  date: new Date().toLocaleString('en', { month: 'short', year: 'numeric' }),
  tag: 'Verified user',
  text: '',
  published: false,
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

const announcementPreviewClasses = {
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

function formatDateTime(value) {
  if (!value) return 'Unknown time'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatBytes(value) {
  const bytes = Number(value) || 0
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function activityLabel(action) {
  const labels = {
    website_content_updated: 'Saved website content',
    site_media_uploaded: 'Uploaded site image',
    support_message_updated: 'Updated support message',
  }

  return labels[action] || action.replace(/_/g, ' ')
}

function broadcastAnnouncement(announcement) {
  const eventName = 'barnbuddy:announcement-updated'
  const nextAnnouncement = { ...defaultSiteContent.announcement, ...(announcement || {}) }
  window.dispatchEvent(new CustomEvent(eventName, { detail: nextAnnouncement }))
  localStorage.setItem(eventName, JSON.stringify(nextAnnouncement))
}

function broadcastMaintenance(maintenance) {
  const eventName = 'barnbuddy:maintenance-updated'
  const nextMaintenance = { ...defaultSiteContent.maintenance, ...(maintenance || {}) }
  window.dispatchEvent(new CustomEvent(eventName, { detail: nextMaintenance }))
  localStorage.setItem(eventName, JSON.stringify(nextMaintenance))
}

const quickLinks = [
  { label: 'Clerk', url: 'https://dashboard.clerk.com/' },
  { label: 'Railway', url: 'https://railway.app/dashboard' },
  { label: 'Resend', url: 'https://resend.com/emails' },
  { label: 'GitHub', url: 'https://github.com/' },
  { label: 'Docs Site', url: 'https://doc.barnbuddy.pro' },
  { label: 'Live Site', url: 'https://barnbuddy.pro' },
]

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
  const [lastSavedContent, setLastSavedContent] = useState(defaultSiteContent)
  const [selectedPostIndex, setSelectedPostIndex] = useState(0)
  const [selectedReviewIndex, setSelectedReviewIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [mediaLibrary, setMediaLibrary] = useState([])
  const [supportMessages, setSupportMessages] = useState([])
  const [newsletterSubscribers, setNewsletterSubscribers] = useState([])
  const [adminDataLoading, setAdminDataLoading] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [notAuthenticated, setNotAuthenticated] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadActivity = useCallback(async function loadActivity() {
    try {
      setActivityLoading(true)
      const res = await authFetch(`${API_BASE_URL}/site-content/admin/activity?limit=40`)
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to load admin activity.')
      }

      setActivity(Array.isArray(data.activity) ? data.activity : [])
    } catch (err) {
      console.warn('Failed to load admin activity:', err.message)
    } finally {
      setActivityLoading(false)
    }
  }, [authFetch])

  const loadAdminTools = useCallback(async function loadAdminTools() {
    try {
      setAdminDataLoading(true)
      const [mediaRes, supportRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/site-content/admin/media?limit=80`),
        authFetch(`${API_BASE_URL}/site-content/admin/support`),
      ])
      const [mediaData, supportData] = await Promise.all([
        mediaRes.json().catch(() => ({})),
        supportRes.json().catch(() => ({})),
      ])

      if (mediaRes.ok) setMediaLibrary(Array.isArray(mediaData.media) ? mediaData.media : [])
      if (supportRes.ok) {
        setSupportMessages(Array.isArray(supportData.messages) ? supportData.messages : [])
        setNewsletterSubscribers(Array.isArray(supportData.newsletterSubscribers) ? supportData.newsletterSubscribers : [])
      }
    } catch (err) {
      console.warn('Failed to load admin tools:', err.message)
    } finally {
      setAdminDataLoading(false)
    }
  }, [authFetch])

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
          const loadedContent = {
            newsPosts: Array.isArray(data.newsPosts) ? data.newsPosts : defaultSiteContent.newsPosts,
            status: { ...defaultSiteContent.status, ...(data.status || {}) },
            announcement: { ...defaultSiteContent.announcement, ...(data.announcement || {}) },
            maintenance: { ...defaultSiteContent.maintenance, ...(data.maintenance || {}) },
            reviews: Array.isArray(data.reviews) ? data.reviews : defaultSiteContent.reviews,
          }
          setContent(loadedContent)
          setLastSavedContent(loadedContent)
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
    loadActivity()
    loadAdminTools()

    return () => {
      cancelled = true
    }
  }, [authFetch, loadActivity, loadAdminTools])

  useEffect(() => {
    if (selectedPostIndex > content.newsPosts.length - 1) {
      setSelectedPostIndex(Math.max(content.newsPosts.length - 1, 0))
    }
  }, [content.newsPosts.length, selectedPostIndex])

  useEffect(() => {
    if (selectedReviewIndex > (content.reviews || []).length - 1) {
      setSelectedReviewIndex(Math.max((content.reviews || []).length - 1, 0))
    }
  }, [content.reviews, selectedReviewIndex])

  const dashboardStats = useMemo(() => {
    const publishedPosts = content.newsPosts.filter((post) => post.published !== false).length
    const draftPosts = content.newsPosts.length - publishedPosts
    const publishedReviews = (content.reviews || []).filter((review) => review.published !== false).length
    const flaggedServices = (content.status.services || []).filter((service) =>
      ['yellow', 'red'].includes(service.tone)
    ).length

    return [
      { label: 'Published posts', value: publishedPosts },
      { label: 'Draft posts', value: draftPosts },
      { label: 'Reviews', value: publishedReviews },
      { label: 'Services', value: content.status.services?.length || 0 },
      { label: 'Support', value: supportMessages.length },
      { label: 'Activity items', value: activity.length },
      { label: 'Needs attention', value: flaggedServices },
    ]
  }, [activity.length, content, supportMessages.length])

  const selectedPost = content.newsPosts[selectedPostIndex] || null
  const selectedReview = (content.reviews || [])[selectedReviewIndex] || null
  const featuredPostId = content.newsPosts.find((post) => post.featured)?.id || ''
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(lastSavedContent),
    [content, lastSavedContent]
  )

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

  function updateReview(index, changes) {
    setContent((current) => ({
      ...current,
      reviews: (current.reviews || []).map((review, reviewIndex) =>
        reviewIndex === index ? { ...review, ...changes } : review
      ),
    }))
  }

  function addReview() {
    setContent((current) => ({
      ...current,
      reviews: [{ ...blankReview }, ...(current.reviews || [])],
    }))
    setSelectedReviewIndex(0)
    setActiveTab('reviews')
  }

  function removeReview(index) {
    setContent((current) => ({
      ...current,
      reviews: (current.reviews || []).filter((_, reviewIndex) => reviewIndex !== index),
    }))
    setSelectedReviewIndex((current) => Math.max(current - 1, 0))
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

  function updateAnnouncement(changes) {
    setContent((current) => ({
      ...current,
      announcement: { ...defaultSiteContent.announcement, ...current.announcement, ...changes },
    }))
  }

  function updateMaintenance(changes) {
    setContent((current) => ({
      ...current,
      maintenance: { ...defaultSiteContent.maintenance, ...current.maintenance, ...changes },
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
        announcement: { ...content.announcement, ...(data.announcement || {}) },
        maintenance: { ...content.maintenance, ...(data.maintenance || {}) },
        reviews: Array.isArray(data.reviews) ? data.reviews : content.reviews,
      })
      setLastSavedContent({
        newsPosts: Array.isArray(data.newsPosts) ? data.newsPosts : content.newsPosts,
        status: { ...content.status, ...(data.status || {}) },
        announcement: { ...content.announcement, ...(data.announcement || {}) },
        maintenance: { ...content.maintenance, ...(data.maintenance || {}) },
        reviews: Array.isArray(data.reviews) ? data.reviews : content.reviews,
      })
      broadcastAnnouncement({ ...content.announcement, ...(data.announcement || {}) })
      broadcastMaintenance({ ...content.maintenance, ...(data.maintenance || {}) })
      toast.success('Website content saved.')
      await loadActivity()
      await loadAdminTools()
    } catch (err) {
      toast.error(err.message || 'Failed to save website content.')
    } finally {
      setSaving(false)
    }
  }

  function discardChanges() {
    setContent(lastSavedContent)
    toast.info('Unsaved changes discarded.')
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
      await loadActivity()
      await loadAdminTools()
    } catch (err) {
      toast.error(err.message || 'Failed to upload image.')
    } finally {
      setUploadingImage(false)
    }
  }

  async function updateSupportStatus(id, status) {
    try {
      const res = await authFetch(`${API_BASE_URL}/site-content/admin/support/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to update support message.')
      }

      setSupportMessages((current) => current.map((message) => (message.id === id ? data.message : message)))
      toast.success('Support message updated.')
      await loadActivity()
    } catch (err) {
      toast.error(err.message || 'Failed to update support message.')
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

          <a
            href="/"
            className="mt-5 hidden rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-center text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white lg:block"
          >
            Back to site
          </a>

          <nav className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {[
              ['overview', 'Overview'],
              ['announcement', 'Banner'],
              ['maintenance', 'Maintenance'],
              ['news', 'News'],
              ['reviews', 'Reviews'],
              ['status', 'Status'],
              ['media', 'Media'],
              ['links', 'Links'],
              ['support', 'Support'],
              ['activity', 'Activity'],
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
              <p className={`mt-2 text-sm ${hasUnsavedChanges ? 'text-amber-300' : 'text-emerald-300'}`}>
                {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
              </p>
            </div>
            <div className="hidden gap-3 lg:flex">
              <a
                href="/"
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Landing
              </a>
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
                onClick={discardChanges}
                disabled={!hasUnsavedChanges || saving}
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={saveContent}
                disabled={saving || !hasUnsavedChanges}
                className="rounded-md bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </header>

          {activeTab === 'overview' && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-7">
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
                          <p className="mt-1 text-sm text-slate-400">{post.category || 'Updates'} - {formatDate(post.date)}</p>
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

              <section className="rounded-lg border border-slate-800 bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <div>
                    <h3 className="font-semibold">Recent admin activity</h3>
                    <p className="mt-1 text-sm text-slate-400">Latest saves and uploads.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                  >
                    View all
                  </button>
                </div>
                <div className="divide-y divide-slate-800">
                  {activity.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{activityLabel(item.action)}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.actor?.name || 'Unknown admin'}</p>
                      </div>
                      <time className="text-sm text-slate-500" dateTime={item.createdAt}>
                        {formatDateTime(item.createdAt)}
                      </time>
                    </div>
                  ))}
                  {!activity.length && (
                    <div className="px-5 py-6 text-sm text-slate-400">
                      {activityLoading ? 'Loading activity...' : 'No admin activity recorded yet.'}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Quick links</h3>
                    <p className="mt-1 text-sm text-slate-400">Jump to admin tools outside BarnBuddy.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('links')}
                    className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                  >
                    Open
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {quickLinks.slice(0, 6).map((link) => (
                    <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="rounded-md border border-slate-800 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                      {link.label}
                    </a>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'announcement' && (
            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_24rem]">
              <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Announcement banner</h3>
                    <p className="mt-1 text-sm text-slate-400">Show a large site-wide message above public pages.</p>
                  </div>
                  <label className={`flex w-fit items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold ${content.announcement?.enabled ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : 'border-slate-800 bg-slate-950/45 text-slate-200'}`}>
                    <input
                      type="checkbox"
                      checked={content.announcement?.enabled === true}
                      onChange={(event) => updateAnnouncement({ enabled: event.target.checked })}
                    />
                    Enabled
                  </label>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Title">
                    <input className={inputClass()} value={content.announcement?.title || ''} onChange={(event) => updateAnnouncement({ title: event.target.value })} />
                  </Field>
                  <Field label="Tone">
                    <select className={inputClass()} value={content.announcement?.tone || 'blue'} onChange={(event) => updateAnnouncement({ tone: event.target.value })}>
                      {toneOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Message" span="md:col-span-2">
                    <textarea className={inputClass('min-h-40 resize-y text-base leading-relaxed')} value={content.announcement?.message || ''} onChange={(event) => updateAnnouncement({ message: event.target.value })} />
                  </Field>
                  <Field label="Link text">
                    <input className={inputClass()} value={content.announcement?.linkText || ''} onChange={(event) => updateAnnouncement({ linkText: event.target.value })} />
                  </Field>
                  <Field label="Link URL">
                    <input className={inputClass()} value={content.announcement?.linkUrl || ''} onChange={(event) => updateAnnouncement({ linkUrl: event.target.value })} />
                  </Field>
                </div>
              </section>

              <aside className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <h3 className="font-semibold">Preview</h3>
                <div className={`mt-4 rounded-lg border p-5 ${announcementPreviewClasses[content.announcement?.tone || 'blue'] || announcementPreviewClasses.blue}`}>
                  {content.announcement?.title && (
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-85">
                      {content.announcement.title}
                    </p>
                  )}
                  <p className="mt-2 text-xl font-semibold leading-snug">
                    {content.announcement?.message || 'Your announcement message will appear here.'}
                  </p>
                  {content.announcement?.linkText && (
                    <p className="mt-4 inline-flex rounded-md bg-white/90 px-4 py-2 text-sm font-semibold text-slate-950">
                      {content.announcement.linkText}
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_24rem]">
              <section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Maintenance mode</h3>
                    <p className="mt-1 text-sm text-slate-400">Temporarily replace public pages with a maintenance screen.</p>
                  </div>
                  <label className={`flex w-fit items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold ${content.maintenance?.enabled ? 'border-amber-300/25 bg-amber-400/10 text-amber-100' : 'border-slate-800 bg-slate-950/45 text-slate-200'}`}>
                    <input
                      type="checkbox"
                      checked={content.maintenance?.enabled === true}
                      onChange={(event) => updateMaintenance({ enabled: event.target.checked })}
                    />
                    {content.maintenance?.enabled ? 'Maintenance on' : 'Maintenance off'}
                  </label>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4">
                  <Field label="Title">
                    <input className={inputClass()} value={content.maintenance?.title || ''} onChange={(event) => updateMaintenance({ title: event.target.value })} />
                  </Field>
                  <Field label="Message">
                    <textarea className={inputClass('min-h-36 resize-y text-base leading-relaxed')} value={content.maintenance?.message || ''} onChange={(event) => updateMaintenance({ message: event.target.value })} />
                  </Field>
                  <Field label="Estimated return">
                    <input className={inputClass()} value={content.maintenance?.estimatedReturn || ''} onChange={(event) => updateMaintenance({ estimatedReturn: event.target.value })} placeholder="Example: Tonight at 9 PM CT" />
                  </Field>
                </div>
              </section>

              <aside className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <h3 className="font-semibold">Public preview</h3>
                <div className="mt-4 rounded-lg border border-sky-300/20 bg-[#0f2650] p-6 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Maintenance Mode</p>
                  <h4 className="mt-3 text-2xl font-semibold leading-tight">{content.maintenance?.title || defaultSiteContent.maintenance.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-white/75">{content.maintenance?.message || defaultSiteContent.maintenance.message}</p>
                  {content.maintenance?.estimatedReturn && (
                    <p className="mt-4 rounded-md border border-white/10 bg-white/8 px-3 py-2 text-xs font-semibold text-sky-100">
                      Expected back: {content.maintenance.estimatedReturn}
                    </p>
                  )}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  Admin stays accessible while this is on. Login remains available so you can get back into admin if your session expires.
                </p>
              </aside>
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
                        <p className="mt-1 text-sm text-slate-400">{selectedPost.category || 'Updates'} - {formatDate(selectedPost.date)}</p>
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

          {activeTab === 'reviews' && (
            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[24rem_1fr]">
              <section className="rounded-lg border border-slate-800 bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                  <div>
                    <h3 className="font-semibold">Reviews</h3>
                    <p className="mt-1 text-sm text-slate-400">{(content.reviews || []).length} total reviews</p>
                  </div>
                  <button
                    type="button"
                    onClick={addReview}
                    className="rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                  >
                    Add review
                  </button>
                </div>

                <div className="max-h-[calc(100vh-15rem)] overflow-y-auto p-3">
                  {(content.reviews || []).length ? (
                    (content.reviews || []).map((review, index) => (
                      <button
                        key={`${review.name || 'review'}-${index}`}
                        type="button"
                        onClick={() => setSelectedReviewIndex(index)}
                        className={`mb-2 w-full rounded-md border p-3 text-left transition ${
                          selectedReviewIndex === index
                            ? 'border-sky-300 bg-sky-500/12'
                            : 'border-slate-800 bg-slate-950/35 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{review.name || 'Unnamed review'}</p>
                            <p className="mt-1 text-xs text-slate-400">{review.role || 'No role'} - {review.rating || 5} stars</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${review.published === false ? 'bg-amber-400/10 text-amber-100' : 'bg-emerald-400/10 text-emerald-100'}`}>
                            {review.published === false ? 'Draft' : 'Live'}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <EmptyState
                      title="No reviews yet"
                      text="Add a customer review and save changes to show it on the landing page."
                      action={
                        <button type="button" onClick={addReview} className="mt-5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                          Add review
                        </button>
                      }
                    />
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-800 bg-slate-900">
                {selectedReview ? (
                  <>
                    <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-semibold">{selectedReview.name || 'Unnamed review'}</h3>
                        <p className="mt-1 text-sm text-slate-400">{selectedReview.role || 'No role'} - {selectedReview.date || 'No date'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateReview(selectedReviewIndex, { published: selectedReview.published === false })}
                          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                            selectedReview.published === false
                              ? 'border-amber-300/25 bg-amber-400/10 text-amber-100'
                              : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
                          }`}
                        >
                          {selectedReview.published === false ? 'Draft' : 'Published'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeReview(selectedReviewIndex)}
                          className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 p-5 2xl:grid-cols-[1fr_24rem]">
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <Field label="Name">
                            <input className={inputClass()} value={selectedReview.name || ''} onChange={(event) => updateReview(selectedReviewIndex, { name: event.target.value })} />
                          </Field>
                          <Field label="Role">
                            <input className={inputClass()} value={selectedReview.role || ''} onChange={(event) => updateReview(selectedReviewIndex, { role: event.target.value })} placeholder="Example: Small Farmer" />
                          </Field>
                          <Field label="Rating">
                            <select className={inputClass()} value={selectedReview.rating || 5} onChange={(event) => updateReview(selectedReviewIndex, { rating: Number(event.target.value) })}>
                              <option value="5">5 stars</option>
                              <option value="4.5">4.5 stars</option>
                              <option value="4">4 stars</option>
                              <option value="3.5">3.5 stars</option>
                              <option value="3">3 stars</option>
                            </select>
                          </Field>
                          <Field label="Date">
                            <input className={inputClass()} value={selectedReview.date || ''} onChange={(event) => updateReview(selectedReviewIndex, { date: event.target.value })} placeholder="Example: Jun 2026" />
                          </Field>
                          <Field label="Tag" span="md:col-span-2">
                            <input className={inputClass()} value={selectedReview.tag || ''} onChange={(event) => updateReview(selectedReviewIndex, { tag: event.target.value })} placeholder="Example: Verified user" />
                          </Field>
                          <Field label="Review text" span="md:col-span-2">
                            <textarea className={inputClass('min-h-44 resize-y')} value={selectedReview.text || ''} onChange={(event) => updateReview(selectedReviewIndex, { text: event.target.value })} />
                          </Field>
                        </div>
                      </div>

                      <aside className="rounded-lg border border-slate-800 bg-slate-950/45 p-4">
                        <h4 className="font-semibold">Landing page preview</h4>
                        <div className="mt-4 rounded-lg bg-slate-950 p-3">
                          <ReviewLandingCard
                            name={selectedReview.name || 'Customer Name'}
                            role={selectedReview.role || 'BarnBuddy user'}
                            rating={Number(selectedReview.rating) || 5}
                            date={selectedReview.date || 'Jun 2026'}
                            tag={selectedReview.tag || 'Verified user'}
                            text={selectedReview.text || 'Write the review text here and the preview will update.'}
                          />
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                          Draft reviews stay saved in admin but do not show on the public landing page.
                        </p>
                      </aside>
                    </div>
                  </>
                ) : (
                  <div className="p-5">
                    <EmptyState
                      title="Select or add a review"
                      text="Choose a review from the list or add a new one to start editing."
                      action={
                        <button type="button" onClick={addReview} className="mt-5 rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600">
                          Add review
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

          {activeTab === 'media' && (
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Media library</h3>
                  <p className="mt-1 text-sm text-slate-400">Uploaded images for news posts and site content.</p>
                </div>
                <button
                  type="button"
                  onClick={() => loadAdminTools()}
                  className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  {adminDataLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
                {mediaLibrary.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/45">
                    <div className="aspect-[16/10] bg-slate-950">
                      <img src={item.url?.startsWith('/api/') ? `${API_URL}${item.url}` : item.url} alt={item.filename} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm font-semibold text-white">{item.filename}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatBytes(item.size)} - {formatDateTime(item.createdAt)}</p>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(item.url?.startsWith('/api/') ? `${API_URL}${item.url}` : item.url)}
                        className="mt-3 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                      >
                        Copy URL
                      </button>
                    </div>
                  </article>
                ))}

                {!mediaLibrary.length && (
                  <div className="sm:col-span-2 xl:col-span-4">
                    <EmptyState title="No media yet" text="Images uploaded from news posts will show up here." />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-5 py-4">
                <h3 className="text-xl font-semibold">Admin quick links</h3>
                <p className="mt-1 text-sm text-slate-400">Shortcuts to the tools you use to run BarnBuddy.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                {quickLinks.map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-800 bg-slate-950/45 p-5 transition hover:border-sky-300/40 hover:bg-slate-800">
                    <p className="text-lg font-semibold text-white">{link.label}</p>
                    <p className="mt-2 break-all text-sm text-slate-500">{link.url}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_22rem]">
              <section className="rounded-lg border border-slate-800 bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                  <div>
                    <h3 className="text-xl font-semibold">Support inbox</h3>
                    <p className="mt-1 text-sm text-slate-400">Contact form messages saved from the website.</p>
                  </div>
                  <button type="button" onClick={() => loadAdminTools()} className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                    Refresh
                  </button>
                </div>
                <div className="divide-y divide-slate-800">
                  {supportMessages.map((message) => (
                    <article key={message.id} className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{message.name} - {message.topic}</p>
                          <p className="mt-1 text-sm text-slate-400">{message.email} - {formatDateTime(message.created_at)}</p>
                        </div>
                        <select className={inputClass('w-fit')} value={message.status} onChange={(event) => updateSupportStatus(message.id, event.target.value)}>
                          <option value="new">New</option>
                          <option value="open">Open</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{message.message}</p>
                    </article>
                  ))}
                  {!supportMessages.length && <div className="p-5"><EmptyState title="No support messages" text="New contact form submissions will appear here." /></div>}
                </div>
              </section>

              <aside className="rounded-lg border border-slate-800 bg-slate-900 p-5">
                <h3 className="font-semibold">Newsletter</h3>
                <p className="mt-1 text-sm text-slate-400">Latest subscription records.</p>
                <div className="mt-4 space-y-3">
                  {newsletterSubscribers.slice(0, 12).map((subscriber) => (
                    <div key={subscriber.id} className="rounded-md border border-slate-800 bg-slate-950/45 p-3">
                      <p className="truncate text-sm font-semibold text-white">{subscriber.email}</p>
                      <p className="mt-1 text-xs text-slate-500">{subscriber.status} - {subscriber.source}</p>
                    </div>
                  ))}
                  {!newsletterSubscribers.length && <p className="text-sm text-slate-500">No newsletter subscribers yet.</p>}
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Admin activity</h3>
                  <p className="mt-1 text-sm text-slate-400">A running log of website content changes and uploads.</p>
                </div>
                <button
                  type="button"
                  onClick={loadActivity}
                  className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  {activityLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="divide-y divide-slate-800">
                {activity.map((item) => (
                  <article key={item.id} className="grid grid-cols-1 gap-4 px-5 py-5 xl:grid-cols-[14rem_1fr_13rem]">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.actor?.name || 'Unknown admin'}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{item.actor?.email || item.actor?.clerkUserId || 'No actor details'}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-white">{activityLabel(item.action)}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(item.details || {}).map(([key, value]) => (
                          <span key={key} className="rounded-md border border-slate-800 bg-slate-950/55 px-2.5 py-1 text-xs text-slate-300">
                            <span className="text-slate-500">{key}: </span>
                            {String(value)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <time className="text-sm text-slate-500 xl:text-right" dateTime={item.createdAt}>
                      {formatDateTime(item.createdAt)}
                    </time>
                  </article>
                ))}

                {!activity.length && (
                  <div className="px-5 py-10">
                    <EmptyState
                      title={activityLoading ? 'Loading activity' : 'No activity yet'}
                      text={activityLoading ? 'Checking the latest admin actions.' : 'Saves and image uploads will appear here once they happen.'}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

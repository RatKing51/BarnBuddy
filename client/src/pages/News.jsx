import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import Footer from '../components/Footer'
import Seo from '../seo/Seo'
import { getSiteContent } from '../api/siteContent'
import { defaultSiteContent } from '../data/siteContent'
import { resolveSiteImageUrl } from '../config/siteImages'
import '../styles/news.css'

const storyUrl = (post) => '/news/' + encodeURIComponent(post.id)
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

function Dateline({ post }) {
  const date = new Date(String(post.date).slice(0, 10) + 'T12:00:00')
  return <div className="news-dateline">
    {post.category && <span>{post.category}</span>}
    {Number.isFinite(date.getTime()) && <time dateTime={post.date}>{dateFormat.format(date)}</time>}
  </div>
}

function StoryImage({ post }) {
  if (!post.image || /(?:^|\/)bblogo\.png(?:[?#]|$)/i.test(post.image)) return null
  return <img className="news-photo" src={resolveSiteImageUrl(post.image)} alt={post.imageAlt || ''} style={{ objectFit: post.imageFit === 'contain' ? 'contain' : 'cover' }} />
}

function StoryTeaser({ post, lead }) {
  return <article className={lead ? 'news-lead' : 'news-brief'}>
    <div>
      <Dateline post={post} />
      <h2><Link to={storyUrl(post)}>{post.title}</Link></h2>
      <p>{post.excerpt}</p>
      {lead && <Link className="news-link" to={storyUrl(post)}>Read the story <span aria-hidden="true">→</span></Link>}
    </div>
    <StoryImage post={post} />
  </article>
}

export default function News() {
  const { postId } = useParams()
  const [posts, setPosts] = useState(null)
  useEffect(() => {
    let active = true
    getSiteContent().then(data => {
      if (active) setPosts(data.newsPosts ?? defaultSiteContent.newsPosts)
    }).catch(() => {
      if (active) setPosts(defaultSiteContent.newsPosts)
    })
    return () => { active = false }
  }, [])

  const published = (posts || []).filter(post => post.published !== false)
  const lead = published.find(post => post.featured) || published[0]
  const current = published.find(post => post.id === postId)
  const remaining = published.filter(post => post.id !== (postId || lead?.id))
  return <div className="public-page news-page">
    {postId && <Seo article={current} />}
    <main className="news-shell">
      {postId && <Link className="news-back" to="/news">← BarnBuddy news</Link>}
      {!postId && <header className="news-mast"><h1>BarnBuddy news</h1><p>Dispatches from the barn and the latest on the tools we’re building.</p></header>}
      {!posts ? <p role="status">Loading stories…</p> : postId ? current ? <>
        <article className="news-story">
          <header><Dateline post={current} /><h1>{current.title}</h1><p className="news-deck">{current.excerpt}</p></header>
          <StoryImage post={current} />
          <div className="news-copy">{(current.body || '').trim().split(/\n\s*\n/).filter(Boolean).map((block, index) =>
            block.startsWith('## ') ? <h2 key={index}>{block.slice(3)}</h2> : <p key={index}>{block}</p>
          )}</div>
        </article>
        {remaining.length > 0 && <aside className="news-next"><h2>More from BarnBuddy</h2>{remaining.slice(0, 2).map(post => <Link key={post.id} to={storyUrl(post)}>{post.title} <span aria-hidden="true">→</span></Link>)}</aside>}
      </> : <h1>Story unavailable</h1> : lead ? <>
        <StoryTeaser post={lead} lead />
        {remaining.length > 0 && <section className="news-archive" aria-label="More stories">{remaining.map(post => <StoryTeaser key={post.id} post={post} />)}</section>}
      </> : <section><h2>No stories published yet</h2><Link className="news-link" to="/contact">Contact BarnBuddy</Link></section>}
    </main>
    <Footer />
  </div>
}

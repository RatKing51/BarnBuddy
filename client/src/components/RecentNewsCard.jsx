import React from 'react'
import { Link } from 'react-router'
import { resolveSiteImageUrl } from '../config/siteImages'

export default function RecentNewsCard({
  title = 'News headline goes here',
  excerpt = 'Short summary of the news. Keep it to one or two lines for visual balance.',
  date = '2026-05-24',
  image = '/bblogo.png',
  imageAlt = 'BarnBuddy news thumbnail',
  imageFit = 'cover',
}) {
  const formattedDate = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))

  return (
    <article className="bb-card-lift grid grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/15 sm:grid-cols-[13rem_1fr] lg:grid-cols-[17rem_1fr]">
      <div className="aspect-[16/10] w-full overflow-hidden bg-[#f8fbff] sm:aspect-auto sm:min-h-52">
        <img
          src={resolveSiteImageUrl(image)}
          alt={imageAlt}
          className={`h-full w-full ${imageFit === 'contain' ? 'object-contain p-5' : 'object-cover object-center'}`}
        />
      </div>

      <div className="flex min-w-0 flex-col justify-between p-6 text-white sm:p-7">
        <div>
          <h3 className="text-xl font-bold leading-tight lg:text-2xl">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300 lg:text-base lg:leading-7">{excerpt}</p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
          <time className="text-xs font-semibold text-slate-400" dateTime={date}>{formattedDate}</time>
          <Link className="inline-flex min-h-11 items-center text-sm font-bold text-blue-200 transition hover:text-blue-100" to="/news">
            View update →
          </Link>
        </div>
      </div>
    </article>
  )
}

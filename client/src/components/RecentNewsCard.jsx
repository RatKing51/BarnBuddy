import React from 'react'

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
    <article className="flex flex-col sm:flex-row items-stretch gap-6 bg-transparent">
      <div className="w-full sm:w-1/3 lg:w-1/4 h-72 sm:h-48 lg:h-56 bg-[#f8fbff] border border-white/14 rounded-lg overflow-hidden shadow-lg shadow-black/20">
        <img
          src={image}
          alt={imageAlt}
          className={`h-full w-full ${imageFit === 'contain' ? 'object-contain p-5' : 'object-cover object-center'}`}
        />
      </div>

      <div className="flex-1 bg-blue-600/95 text-white rounded-lg p-8 lg:p-8 shadow-md flex flex-col justify-between">
        <div>
          <h4 className="text-lg lg:text-2xl font-semibold mb-2 leading-tight">{title}</h4>
          <p className="text-sm lg:text-base text-white/90 leading-relaxed">{excerpt}</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <time className="text-xs text-white/70" dateTime={date}>{formattedDate}</time>
          <a className="text-sm bg-white text-blue-700 px-3 py-1.5 rounded-md font-semibold hover:bg-blue-100 transition-colors" href="/news">
            Read
          </a>
        </div>
      </div>
    </article>
  )
}

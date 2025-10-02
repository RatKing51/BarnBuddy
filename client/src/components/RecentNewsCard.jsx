import React from 'react'

export default function RecentNewsCard({ title = 'News headline goes here', excerpt = 'Short summary of the news. Keep it to one or two lines for visual balance.', imageAlt = 'thumbnail' }) {
  return (
    <article className="flex flex-col sm:flex-row items-stretch gap-6 bg-transparent">
      {/* Image placeholder — larger and fixed aspect on wide screens */}
      <div className="w-full sm:w-1/3 lg:w-1/4 h-72 sm:h-48 lg:h-56 bg-white/6 border border-white/14 rounded-lg flex items-center justify-center">
        <div className="w-11/12 h-11/12 border-2 border-white/20 border-dashed rounded-md flex items-center justify-center">
          <span className="text-white/40 text-sm">{imageAlt}</span>
        </div>
      </div>

      {/* Text box — bigger padding and larger type */}
      <div className="flex-1 bg-blue-600/95 text-white rounded-lg p-8 lg:p-8 shadow-md flex flex-col justify-between">
        <div>
          <h4 className="text-lg lg:text-2xl font-semibold mb-2 leading-tight">{title}</h4>
          <p className="text-sm lg:text-base text-white/90 leading-relaxed">{excerpt}</p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <time className="text-xs text-white/70">Oct 1, 2025</time>
          <a className="text-sm bg-white text-blue-700 px-3 py-1.5 rounded-md font-semibold hover:bg-blue-100 transition-colors" href="#">
            Read
          </a>
        </div>
      </div>
    </article>
  )
}
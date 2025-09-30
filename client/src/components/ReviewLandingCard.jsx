import React from 'react'

const ReviewLandingCard = ({ name = 'Avery Cole', role = 'Small Farmer', rating = 4.5, text = "BarnBuddy saved me hours every month. Easy tracking, reliable reminders, and clear herd reports—exactly what I needed to manage my small herd.", date = 'Sep 2025' }) => {
  const fullStars = Math.floor(rating)
  const halfStar = rating % 1 >= 0.5

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 shadow-md max-w-sm w-full">
      {/* Avatar / placeholder */}
      <div className="flex items-start space-x-4">
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/40 font-semibold">
          {name.split(' ').map(n => n[0]).slice(0,2).join('')}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">{name}</div>
              <div className="text-white/70 text-sm">{role} · <span className="text-white/60 text-xs">{date}</span></div>
            </div>

            {/* Stars */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: fullStars }).map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.448 2.712c-.785.57-1.84-.197-1.54-1.118l1.287-3.95a1 1 0 00-.364-1.118L2.56 9.377c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.95z" />
                </svg>
              ))}
              {halfStar && (
                <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 13.347V2.927z" />
                </svg>
              )}
            </div>
          </div>

          {/* Review text */}
          <p className="mt-4 text-white/90 text-sm leading-relaxed">
            {text}
          </p>

          {/* Optional CTA or tags */}
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-xs bg-white/5 text-white/80 px-2 py-1 rounded-full">Verified user</span>
            <span className="text-xs text-white/60">•</span>
            <span className="text-xs text-white/60">BarnBuddy customer</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewLandingCard
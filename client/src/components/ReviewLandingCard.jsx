import React from 'react'

const StarIcon = ({ type = 'full' }) => (
  <svg className="h-4 w-4 text-amber-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    {type === 'half' ? (
      <path d="M10 2.15v11.2l-3.45 2.71c-.78.57-1.84-.2-1.54-1.12l1.29-3.95a1 1 0 0 0-.37-1.12L2.56 7.38c-.78-.57-.38-1.81.59-1.81h4.16a1 1 0 0 0 .95-.69L9.05.93c.15-.46.55-.69.95-.69Z" />
    ) : (
      <path d="M9.05.93c.3-.92 1.6-.92 1.9 0l1.29 3.95a1 1 0 0 0 .95.69h4.16c.97 0 1.37 1.24.59 1.81l-3.37 2.45a1 1 0 0 0-.37 1.12l1.29 3.95c.3.92-.76 1.69-1.54 1.12L10 13.35l-3.45 2.71c-.78.57-1.84-.2-1.54-1.12l1.29-3.95a1 1 0 0 0-.37-1.12L2.56 7.38c-.78-.57-.38-1.81.59-1.81h4.16a1 1 0 0 0 .95-.69L9.05.93Z" />
    )}
  </svg>
)

const ReviewLandingCard = ({
  name = 'Avery Cole',
  role = 'Small Farmer',
  rating = 4.5,
  text = 'BarnBuddy saved me hours every month. Easy tracking, reliable reminders, and clear herd reports.',
  date = 'Sep 2025',
  tag = 'Verified user',
}) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  return (
    <article className="h-full rounded-xl border border-white/10 bg-white/7 p-6 shadow-xl shadow-black/20 transition-transform duration-200 hover:-translate-y-1 hover:bg-white/9">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white ring-4 ring-white/8">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">{name}</h3>
              <p className="text-sm text-white/65">{role}</p>
            </div>
          </div>

          <time className="shrink-0 text-xs text-white/50" dateTime={date}>{date}</time>
        </div>

        <div className="mt-5 flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: fullStars }).map((_, index) => (
            <StarIcon key={index} />
          ))}
          {hasHalfStar && <StarIcon type="half" />}
        </div>

        <p className="mt-5 flex-1 text-sm leading-relaxed text-white/84">"{text}"</p>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/82">{tag}</span>
          <span className="text-xs font-semibold text-blue-200">Verified</span>
        </div>
      </div>
    </article>
  )
}

export default ReviewLandingCard

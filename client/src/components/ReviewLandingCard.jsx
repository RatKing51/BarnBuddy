import '../styles/reviews.css'

export default function ReviewLandingCard({ name, role, rating, text, date, tag, verified }) {
  const score = Number(rating)
  return (
    <figure className="bb-review">
      {(score > 0 && score <= 5 || date) && (
        <div className="bb-review-meta">
          {score > 0 && score <= 5 && <span><span aria-hidden="true">★ </span>{score} out of 5</span>}
          {date && <span>{date}</span>}
        </div>
      )}
      <blockquote>{text}</blockquote>
      <figcaption>
        <strong>{name}</strong>
        {[role, tag, verified && 'Verified'].filter(Boolean).join(' · ')}
      </figcaption>
    </figure>
  )
}

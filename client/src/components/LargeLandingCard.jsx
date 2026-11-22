import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@clerk/react';
import { landingCarouselSlides } from '../data/carouselSlides';
import { resolveProductPreviewUrl } from '../config/siteImages';
import PwaInstallButton from './PwaInstallButton';

export default function LargeLandingCard({ slides = landingCarouselSlides }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const published = slides.filter(slide => slide.published !== false);
  const previews = published.length ? published : landingCarouselSlides;
  const current = Math.min(active, previews.length - 1);
  const selected = previews[current];
  const previewImage = resolveProductPreviewUrl(selected.image);
  const rotating = previews.length > 1 && !paused && !reducedMotion;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive(index => (index + 1) % previews.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [rotating, previews.length]);
  useEffect(() => { setActive(0); }, [slides]);

  return (
    <section className="bb-hero bb-container" aria-labelledby="home-heading">
      <div className="bb-hero-heading">
        <h1 id="home-heading">Livestock records for small farms</h1>
        <div className="bb-hero-intro">
          <p>Record a weight, check the last vet visit, or see which animals are due for care.</p>
          <div className="bb-actions">
            <Link className="bb-button bb-button-primary" to={isLoaded && isSignedIn ? '/dashboard' : '/signup'}>{isLoaded && isSignedIn ? 'Open dashboard' : 'Start free'}</Link>
            <Link className="bb-button bb-button-secondary" to="/#features">Explore the records</Link>
          </div>
          <div className="bb-install"><PwaInstallButton /></div>
        </div>
      </div>
      <div className="bb-product-preview" id="product-preview" role="region" aria-roledescription="carousel" aria-label="BarnBuddy product preview" onFocus={event => { if (event.target.matches(":focus-visible")) setPaused(true); }}>
        <div className="bb-preview-bar">
          <div className="bb-preview-switcher" role="group" aria-label="Product screenshots">
            {previews.map((slide, index) => <button key={`${slide.image}-${index}`} type="button" aria-pressed={index === current} onClick={() => { setPaused(true); setActive(index); }}>{slide.eyebrow}</button>)}
          </div>
          {previews.length > 1 && !reducedMotion && (
            <button className="bb-rotation" type="button" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
              onClick={() => setPaused(value => !value)}>
              <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
            </button>
          )}
        </div>
        <figure>
          <img key={previewImage} src={previewImage} alt={selected.alt} fetchPriority="high" width="1600" height="900" />
          <figcaption aria-live={rotating ? 'off' : 'polite'}><span>{selected.title}</span><a href={previewImage} target="_blank" rel="noreferrer">View full screenshot<span className="sr-only"> (opens in a new tab)</span></a></figcaption>
        </figure>
      </div>
      <div className="bb-audience"><span>Raising livestock for FFA or 4-H?</span><Link to="/#chapter-mode">See how Chapter Mode works</Link></div>
    </section>
  );
}

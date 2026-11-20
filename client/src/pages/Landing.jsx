import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import LargeLandingCard from '../components/LargeLandingCard';
import ReviewLandingCard from '../components/ReviewLandingCard';
import Footer from '../components/Footer';
import MarketingMotion from '../components/MarketingMotion';
import FeatureExplorer from '../components/FeatureExplorer';
import { getSiteContent } from '../api/siteContent';
import { defaultSiteContent } from '../data/siteContent';
import { getSiteAssetUrl, resolveSiteImageUrl } from '../config/siteImages';
import '../styles/marketing.css';

export default function Landing() {
  const [content, setContent] = useState(defaultSiteContent);
  useEffect(() => {
    let cancelled = false;
    getSiteContent().then(data => {
      if (!cancelled) setContent({
        reviews: Array.isArray(data.reviews) ? data.reviews : defaultSiteContent.reviews,
        newsPosts: Array.isArray(data.newsPosts) ? data.newsPosts : defaultSiteContent.newsPosts,
        carouselSlides: Array.isArray(data.carouselSlides) ? data.carouselSlides : defaultSiteContent.carouselSlides,
      });
    }).catch(error => console.warn('Using bundled landing content:', error.message));
    return () => { cancelled = true; };
  }, []);
  const posts = content.newsPosts.filter(post => post.published !== false).slice(0, 2);
  const reviews = content.reviews.filter(review => review.published !== false);
  return (
    <div className="bb-marketing">
      <MarketingMotion />
      <main>
        <LargeLandingCard slides={content.carouselSlides} />
        <section id="features" className="bb-section bb-container">
          <FeatureExplorer />
        </section>
        <section id="chapter-mode" className="bb-chapter">
          <div className="bb-container bb-chapter-layout">
            <div className="bb-chapter-copy" data-reveal><h2>Chapter Mode</h2><p>Members keep their own project records. A student can log a project animal’s weight, write a journal entry, and bring those records to their next advisor meeting.</p><div className="bb-actions"><Link to="/contact?topic=School%20or%20chapter%20pricing" className="bb-button bb-button-light">Ask about chapter pricing</Link><Link to="/pricing" className="bb-text-link">See plans</Link></div><p className="bb-privacy-note">Members choose what to share. Private projects stay private.</p></div>
            <div className="bb-chapter-flow" data-reveal>
              <ol>
                <li><span>1</span><div><h3>Join your chapter</h3><p>Enter the chapter code in your account settings.</p></div></li>
                <li><span>2</span><div><h3>Choose what to share</h3><p>Each member selects the projects they want their advisor to see.</p></div></li>
                <li><span>3</span><div><h3>Review together</h3><p>Open a shared project in the advisor dashboard.</p></div></li>
              </ol>
              <Link to="/settings/account" className="bb-flow-link">Already have a chapter code? Join in account settings</Link>
            </div>
          </div>
        </section>
        <section className="bb-section bb-container bb-story">
          <div data-reveal><h2>It started with our goats</h2><p>My family raises meat goats in Kansas. We had health notes in notebooks and project records in spreadsheets. I built BarnBuddy so we could look up an animal and find both.</p><p>That’s the idea behind the animal profile. When it’s time for another weigh-in or vet visit, the last entry is right there with the new one.</p><Link className="bb-text-link" to="/aboutus">Read the BarnBuddy story</Link></div>
          <div className="bb-founder-photo" data-reveal><img src={getSiteAssetUrl('IMG_5761.JPEG')} alt="BarnBuddy founder Gage Billinger at a Kansas FFA event" loading="lazy" width="1620" height="1080" /><span>Gage Billinger · Founder, BarnBuddy</span></div>
        </section>
        <section className="bb-section bb-container bb-reviews" aria-labelledby="reviews-heading">
          <div className="bb-section-heading">
            <h2 id="reviews-heading">{reviews.length ? 'What farmers are saying' : 'How has BarnBuddy worked for you?'}</h2>
            <Link className="bb-text-link" to="/contact?topic=Review%20or%20feedback">Share your experience</Link>
          </div>
          {reviews.length > 0 && <div className="bb-review-grid">
            {reviews.map(review => <ReviewLandingCard key={review.id || `${review.name}-${review.date}`} {...review} />)}
          </div>}
        </section>
        <section className="bb-section bb-container bb-news"><div className="bb-section-heading"><h2>What’s new</h2><Link to="/news" className="bb-text-link">All updates</Link></div><div className="bb-news-grid" data-reveal>{posts.length ? posts.map(post => <Link to={`/news/${encodeURIComponent(post.id)}`} className="bb-news-item" key={post.id}><div className="bb-news-image"><img src={resolveSiteImageUrl(post.image)} alt={post.imageAlt || ''} loading="lazy" style={{ objectFit: post.imageFit === 'contain' ? 'contain' : 'cover' }} /></div><div><span className="bb-category">{post.category || 'Product update'}</span><h3>{post.title}</h3><p>{post.excerpt}</p><time dateTime={post.date}>{new Date(`${post.date.slice(0,10)}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time></div></Link>) : <p>No updates yet.</p>}</div></section>
        <section className="bb-closing"><div className="bb-container" data-reveal><div><h2>Add your first animal</h2><p>Start with a name or ear tag. You can fill in weights and care records as you go.</p></div><div className="bb-actions"><Link to="/signup" className="bb-button bb-button-primary">Create a free account</Link><Link to="/pricing" className="bb-button bb-button-secondary">Compare plans</Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}

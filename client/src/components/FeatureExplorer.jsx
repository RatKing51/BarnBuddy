import { useState } from 'react';
import { getSiteAssetUrl } from '../config/siteImages';

const features = [
  { title: 'Animal profiles', copy: 'Look up an animal by name or tag and check its weights, vaccinations, and notes.', image: 'generaldata.png', alt: 'BarnBuddy animal profile with identification and general details' },
  { title: 'Herd overview', copy: 'See which animals belong to each herd and which are due for care.', image: 'dashboard.png', alt: 'BarnBuddy herd dashboard showing animal counts and care status' },
  { title: 'Weight history', copy: 'Compare weigh-ins and follow an animal’s growth over time.', image: 'weight-graph.png', alt: 'BarnBuddy weight chart showing recorded weigh-ins' },
  { title: 'Health records', copy: 'Check the date and notes from a vet visit, or export the history to share.', image: 'vetvisits.png', alt: 'BarnBuddy vet visit records' },
];

export default function FeatureExplorer() {
  const [active, setActive] = useState(0);
  const selected = features[active];
  return (
    <div className="bb-explorer" data-reveal>
      <div>
        <h2 id="record-views-heading">Explore your livestock records</h2>
        <p className="bb-explorer-intro">Before a vet visit, pull up the animal’s last treatment. After a weigh-in, check how much it has gained. Pick a view below to see where those records live.</p>
        <div className="bb-explorer-options" role="group" aria-labelledby="record-views-heading">
          {features.map((feature, index) => (
            <button key={feature.image} type="button" aria-pressed={index === active}
              aria-controls="record-view" onClick={() => setActive(index)}>
              <img className="bb-record-thumb" src={getSiteAssetUrl(feature.image)} alt="" loading="lazy" />
              <span>{feature.title}</span>
              <span className="bb-record-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </div>
      <figure id="record-view" className="bb-explorer-image">
        <img key={selected.image} src={getSiteAssetUrl(selected.image)} alt={selected.alt}
          loading="lazy" width="1400" height="900" />
        <figcaption>
          <span aria-live="polite">{selected.copy}</span>
          <a href={getSiteAssetUrl(selected.image)} target="_blank" rel="noreferrer">
            View full screenshot<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </figcaption>
      </figure>
    </div>
  );
}

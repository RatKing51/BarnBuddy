import { Link } from "react-router";
import Footer from "../components/Footer";
import { getSiteAssetUrl } from "../config/siteImages";

export default function About() {
  return (
    <div className="bb-marketing">
      <main>
        <section className="bb-container bb-section bb-story bb-about-story">
          <div>
            <h1>Why I built BarnBuddy</h1>
            <p>I'm Gage Billinger. My family raises meat goats in Kansas, and I built BarnBuddy to keep track of our herd.</p>
            <p>We had health notes in notebooks and project records in spreadsheets. If I wanted to check a goat's last weight or look up a vet visit, I had to remember where we'd written it down.</p>
            <p>That's why BarnBuddy starts with the animal. Pick a name or ear tag and you can see its weigh-ins, care notes, and vet visits together.</p>
            <Link className="bb-text-link" to="/#features">Look inside an animal record</Link>
          </div>
          <figure className="bb-founder-photo">
            <img src={getSiteAssetUrl("IMG_5761.JPEG")} width="1620" height="1080"
              alt="Gage Billinger at a Kansas FFA event" />
            <figcaption>Gage Billinger, BarnBuddy founder</figcaption>
          </figure>
        </section>

        <section className="bb-chapter">
          <div className="bb-container bb-chapter-layout">
            <h2>From the barn to an FFA project</h2>
            <div className="bb-about-projects">
              <p>With a few animals at home, you might only need to know who's due for a vaccination or how much a goat has gained since its last weigh-in.</p>
              <p>If you're raising an animal for FFA or 4-H, those same details are part of a longer story. In FFA Project Mode, you can link the animal to your SAE project and keep journal entries and expenses alongside it. With Chapter Mode, you choose which projects your advisor can see.</p>
              <Link className="bb-text-link" to="/#chapter-mode">See how Chapter Mode works</Link>
            </div>
          </div>
        </section>

        <section className="bb-closing">
          <div className="bb-container">
            <div>
              <h2>Start with your first animal</h2>
              <p>Add a name or ear tag. Fill in the rest as you go.</p>
              <Link className="bb-text-link" to="/help">Help with getting started</Link>
            </div>
            <div className="bb-actions">
              <Link className="bb-button bb-button-primary" to="/signup">Create a free account</Link>
              <Link className="bb-button bb-button-secondary" to="/pricing">Compare plans</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

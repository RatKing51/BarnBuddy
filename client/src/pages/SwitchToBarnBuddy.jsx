import { Link } from "react-router";
import Footer from "../components/Footer";
import { PAGE_FAQS } from "../seo/siteMetadata";

const records = [
  ["Animal profiles", "Keep names, tags, species, and other animal details together so you can find the right record when you need it."],
  ["Herds", "Organize animals into herds and see how each group is doing from your dashboard."],
  ["Health and vaccinations", "Keep health events, vaccination dates, and vet visit history with the animal profile."],
  ["Weights", "Log weigh-ins over time and refer back to earlier measurements when you plan the next one."],
];

function Faq() {
  return (
    <section className="bb-section bb-container bb-seo-faq" aria-labelledby="switch-faq-heading">
      <div className="bb-route-intro">
        <h2 id="switch-faq-heading">Switching questions</h2>
        <p>Know what to expect before you move your records.</p>
      </div>
      {PAGE_FAQS["/switch-to-barnbuddy"].map(({ question, answer }) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}

export default function SwitchToBarnBuddy() {
  return (
    <div className="bb-marketing bb-seo-page">
      <main>
        <section className="bb-section bb-container bb-seo-hero">
          <div className="bb-route-intro">
            <p className="bb-hero-label">Livestock records for small farms</p>
            <h1>Bring your livestock records together</h1>
            <p>Ready for easier livestock record keeping? BarnBuddy gives small farms a practical place for animal profiles, herds, health history, and weights—without making everyday records feel like another full-time job.</p>
            <div className="bb-actions">
              <Link className="bb-button bb-button-primary" to="/signup">Create a free account</Link>
              <Link className="bb-button bb-button-secondary" to="/pricing">Compare plans</Link>
            </div>
          </div>
          <aside className="bb-seo-note" aria-label="A simpler record-keeping routine">
            <h2>One animal, one place to look</h2>
            <p>Find the details you’ve saved for an animal, then add the next weigh-in, health note, or vaccination as it happens.</p>
            <Link className="bb-text-link" to="/#features">Explore animal records and features</Link>
          </aside>
        </section>

        <section className="bb-section bb-container" aria-labelledby="paperwork-heading">
          <div className="bb-section-heading">
            <h2 id="paperwork-heading">When the record is hard to find, it is hard to use</h2>
            <p>Paper notes can get separated from the animal. Spreadsheets can be useful, but dates, tabs, and versions take attention to maintain.</p>
          </div>
          <div className="bb-feature-list bb-seo-grid bb-seo-two">
            <article><h3>Notes spread across places</h3><p>A vaccination date might be in a notebook while the latest weight is in a phone note. Looking back means remembering where each detail went.</p></article>
            <article><h3>Spreadsheets need upkeep</h3><p>Rows and columns can track a lot, but it takes care to keep animal names, dates, and updates consistent as your herd changes.</p></article>
          </div>
        </section>

        <section className="bb-chapter" aria-labelledby="organized-heading">
          <div className="bb-container">
            <div className="bb-section-heading">
              <h2 id="organized-heading">A simple home for everyday animal information</h2>
              <p>BarnBuddy connects each animal profile with the records you add over time.</p>
            </div>
            <div className="bb-feature-list bb-seo-grid">
              {records.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}
            </div>
            <p className="bb-seo-inline-link">See the <Link className="bb-text-link" to="/#features">feature overview</Link> or read about <Link className="bb-text-link" to="/help">getting help with BarnBuddy</Link>.</p>
          </div>
        </section>

        <section className="bb-section bb-container bb-seo-transition" aria-labelledby="transition-heading">
          <div>
            <div className="bb-route-intro">
              <h2 id="transition-heading">Move over at a pace that works for you</h2>
              <p>Start with current animals and the details you rely on most. Add older notes as time allows; you do not have to rebuild every past season before getting value from a new record.</p>
            </div>
            <p>You can add animals individually, import a structured CSV, or use the Import Assistant to create an editable draft from supported photos and documents. Review every draft and confirm it before import. BarnBuddy does not promise automatic migration from another farm platform, and some historical information may need to be entered manually.</p>
            <p>If your records are on paper or in a file that does not fit an available import method, keep the original nearby and enter the important animal details and dates by hand. Check the imported or entered information against your source records.</p>
          </div>
          <aside className="bb-seo-note">
            <h3>Start with the next record</h3>
            <p>Create a profile, then add the next weight or care event. Bring in older details when you need them.</p>
            <Link className="bb-text-link" to="/signup">Get started with BarnBuddy</Link>
          </aside>
        </section>

        <section className="bb-chapter" aria-labelledby="first-steps-heading">
          <div className="bb-container bb-seo-steps">
            <div><h2 id="first-steps-heading">Getting started</h2><p>Set up the records that will make your day-to-day work easier to follow.</p></div>
            <ol>
              <li><h3>Create your account</h3><p>Start on the Free plan and add an animal profile.</p></li>
              <li><h3>Organize your herd</h3><p>Group animals, then add health, vaccination, vet, and weight information as you go.</p></li>
              <li><h3>Choose what to bring in</h3><p>Enter a few key records yourself or use a supported CSV or reviewed import draft.</p></li>
            </ol>
          </div>
        </section>

        <Faq />
        <section className="bb-closing"><div className="bb-container"><div><h2>Start with the animals you have</h2><p>Add one profile and build a useful record as you go.</p></div><div className="bb-actions"><Link className="bb-button bb-button-primary" to="/signup">Create a free account</Link><Link className="bb-button bb-button-secondary" to="/pricing">See pricing</Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}

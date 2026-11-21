import { Link } from "react-router";
import Footer from "../components/Footer";
import { PAGE_FAQS } from "../seo/siteMetadata";
import "../styles/marketing.css";

const projectRecords = [
  ["Animal profile", "Keep the animal’s name, tag, species, and project details together."],
  ["Weights", "Add dated weigh-ins to the animal record and compare them over the project."],
  ["Health and vaccinations", "Record health events, vaccination information, and vet visits with the animal."],
  ["Project journal", "Log work sessions, observations, learning activities, and show preparation in FFA Project Mode."],
];

function Faq() {
  return (
    <section className="bb-section bb-container bb-seo-faq" aria-labelledby="ffa-faq-heading">
      <div className="bb-route-intro">
        <h2 id="ffa-faq-heading">Questions about FFA projects</h2>
        <p>Check how project records, student sharing, and plans work.</p>
      </div>
      {PAGE_FAQS["/ffa-livestock-records"].map(({ question, answer }) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}

export default function FfaLivestockRecords() {
  return (
    <div className="bb-marketing bb-seo-page">
      <main>
        <section className="bb-section bb-container bb-seo-hero">
          <div className="bb-route-intro">
            <p className="bb-hero-label">For FFA livestock projects</p>
            <h1>Keep your FFA livestock project records together</h1>
            <p>Build a useful record of your project animal over time. BarnBuddy brings animal details, weights, health history, and project activities into a place you can return to as the season moves along.</p>
            <div className="bb-actions">
              <Link className="bb-button bb-button-primary" to="/signup">Create an account</Link>
              <Link className="bb-button bb-button-secondary" to="/pricing">Compare plans</Link>
            </div>
          </div>
          <aside className="bb-seo-note" aria-label="FFA Project Mode plan information">
            <h2>Animal records and project records, connected</h2>
            <p>FFA Project Mode is a Premium feature. Link an existing animal profile to a project, then keep project journal and finance entries alongside its animal records.</p>
            <Link className="bb-text-link" to="/pricing">See plans and features</Link>
          </aside>
        </section>

        <section className="bb-section bb-container" aria-labelledby="organized-project-heading">
          <div className="bb-section-heading">
            <h2 id="organized-project-heading">Good records make a project easier to review</h2>
            <p>Consistent dates and notes help students look back at animal care and progress, prepare for conversations with an advisor, and find details when they need them.</p>
          </div>
          <div className="bb-feature-list bb-seo-grid">
            {projectRecords.map(([title, copy]) => <article key={title}><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
          <p className="bb-seo-inline-link">Explore <Link className="bb-text-link" to="/#features">animal record features</Link> and <Link className="bb-text-link" to="/#chapter-mode">Chapter Mode</Link>.</p>
        </section>

        <section className="bb-chapter" aria-labelledby="example-heading">
          <div className="bb-container bb-seo-transition">
            <div>
              <div className="bb-route-intro">
                <h2 id="example-heading">A show animal, from weigh-in to show day</h2>
                <p>A practical example of keeping the details close together.</p>
              </div>
              <p>A student adds a market steer to BarnBuddy with its name and tag, then links that existing profile to a “Market Steer SAE” project. After a weigh-in, they enter the date and weight. They log a vaccination or vet visit in the animal’s health history, then add a journal entry about ration adjustments or show preparation.</p>
              <p>At the next check-in, the student can look through the animal’s weight history and project journal. This can help organize a discussion with an advisor; the student should still follow their chapter’s record-keeping instructions.</p>
            </div>
            <aside className="bb-seo-note">
              <h3>What Project Mode includes</h3>
              <p>Project setup, linked animals, goals, journal activities, project finances, and member-controlled project sharing.</p>
              <Link className="bb-text-link" to="/help">Read the Help Center</Link>
            </aside>
          </div>
        </section>

        <section className="bb-section bb-container bb-seo-transition" aria-labelledby="student-mode-heading">
          <div>
            <div className="bb-route-intro">
              <h2 id="student-mode-heading">FFA Project Mode keeps the project connected to the animal</h2>
              <p>Students can make a project, link animals already in BarnBuddy, add project details and goals, and keep journal activities and finances. Project Mode uses the animal’s existing profile and records as their source of truth.</p>
            </div>
            <p>Members control which projects they share with an advisor. Chapter Mode supports joining with a chapter code and lets an advisor review the projects a member has chosen to share. Keep private projects private, and check your school's account and privacy requirements before using the service with students.</p>
          </div>
          <aside className="bb-seo-note">
            <h3>For teachers and chapter advisors</h3>
            <p>Chapter Mode can support review of member-shared projects. Talk with BarnBuddy about chapter pricing, setup, and fit for your program.</p>
            <div className="bb-actions"><Link className="bb-button bb-button-primary" to="/contact?topic=School%20or%20chapter%20pricing">Ask about chapter pricing</Link><Link className="bb-text-link" to="/#chapter-mode">How Chapter Mode works</Link></div>
          </aside>
        </section>

        <section className="bb-section bb-container bb-seo-disclaimer" aria-label="FFA affiliation disclaimer">
          <p>BarnBuddy is an independent platform and is not officially affiliated with or endorsed by the National FFA Organization. BarnBuddy does not replace official FFA record books, SAE requirements, or instructions from a student's chapter or advisor.</p>
        </section>

        <Faq />
        <section className="bb-closing"><div className="bb-container"><div><h2>Keep your project records moving</h2><p>Start with an animal profile and add project details when you're ready.</p></div><div className="bb-actions"><Link className="bb-button bb-button-primary" to="/signup">Create an account</Link><Link className="bb-button bb-button-secondary" to="/pricing">See pricing</Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}

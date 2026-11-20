import { Link } from 'react-router'
import Footer from '../components/Footer'

const supportEmail = 'barnbuddyapp@gmail.com'

const documents = {
  terms: {
    title: 'Terms of Service',
    updated: 'November 20, 2026',
    intro: 'These terms describe the basic rules for using BarnBuddy, a livestock record-keeping web application for small operations, students, families, and agricultural organizations.',
    sections: [
      ['Accounts and age', 'Some features require a Clerk account. Keep your sign-in information secure and provide accurate account details. BarnBuddy’s sign-up flow does not currently ask for a user’s age. Because students use the service, the age and parent or school permission rules need founder and legal review before BarnBuddy can make a broader eligibility statement.'],
      ['Your records', 'You remain responsible for the animal, herd, health, financial, project, and other information you enter or upload. You retain your rights in that content and allow BarnBuddy to process it to operate the features you use. Check records for accuracy, especially dates and imported information.'],
      ['Sharing and acceptable use', 'FFA Project Mode can share selected project information with an advisor when you enable sharing. Do not use BarnBuddy to violate law, access another person’s data, interfere with the service, or upload harmful code.'],
      ['Plans and payment', 'BarnBuddy publicly lists Premium at $5 per month. Checkout and subscription management are provided through Clerk Billing. The configured processor, taxes, renewal timing, refund handling, and any plan-specific terms must be confirmed against the live checkout before purchase; the checkout terms govern the transaction.'],
      ['Livestock records and service availability', 'BarnBuddy is a record-keeping tool, not veterinary advice or an emergency service. Verify reminders and records and consult a qualified veterinarian for animal-health decisions. Keep your own copies of records you cannot afford to lose. Features may change or be unavailable.'],
      ['Account closure and changes', 'You can request account deletion from Account Settings. See the Data Retention and Deletion Policy for what the current deletion workflow removes and its limits. BarnBuddy may suspend access for misuse. Material updates to these terms will be reflected here.'],
      ['Contact', `Questions about these terms: ${supportEmail}.`],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'November 20, 2026',
    intro: 'This policy describes information BarnBuddy handles through the website and app, based on the current code and configured providers reviewed for this release.',
    sections: [
      ['Information you provide', 'Clerk handles sign-in and authentication. BarnBuddy’s database stores account name and email, onboarding choices (such as user type, species, herd-size range and goals), preferences, and the livestock, health, vaccination, vet, breeding, finance, feed, inventory, and FFA project information you enter. You may also provide support messages, newsletter email addresses, and uploaded animal or import files.'],
      ['How information is used', 'BarnBuddy uses this information to provide account access, save and display records, enforce plan and access rules, support user requests, send enabled care reminders, operate account and billing features, and protect the service. AI-assisted import requests send the file and notes you choose to submit to OpenAI to draft records. Review the result before saving it.'],
      ['Service providers and sharing', 'The application uses Clerk for identity and Billing UI; PostgreSQL for app records; Railway for hosting; Cloudflare R2 for uploaded files; Resend for email and newsletter operations; and OpenAI for optional AI-assisted imports. Their handling is governed by their own terms and settings. BarnBuddy does not include an analytics or advertising SDK in the reviewed client code. If you enable FFA project sharing, the selected project information is visible to the associated chapter advisor. BarnBuddy does not sell personal information.'],
      ['Cookies and browser storage', 'Clerk may use browser storage needed for authentication. The site also uses local storage for a contact-form cooldown and registers a service worker for the installable web app. No nonessential analytics or advertising tracker was found in the reviewed code. See the Cookie Policy.'],
      ['Retention and deletion', 'Records are kept while your account is active. Account deletion removes the user row and related records through database deletion rules and asks Clerk to delete the identity. Uploaded object cleanup is attempted after the database transaction; a failed object deletion is logged and is not automatically retried by this workflow. Chapter advisor contact fields and some admin activity history can remain separately from the account. Backup retention periods have not been confirmed. See the Data Retention and Deletion Policy.'],
      ['Your choices', 'You can update account preferences, manage newsletter subscription settings, and delete your account in Account Settings. BarnBuddy has PDF record exports, but no full account-data export endpoint was found in the reviewed application. Contact support to ask about access or correction requests.'],
      ['Children and students', 'The service is used by FFA and 4-H students and may contain project and school-related details. The current sign-up flow does not collect age or request parent consent. BarnBuddy’s under-13 language and any school or parental consent process require founder and legal review. Please do not submit unnecessary sensitive information about students.'],
      ['Contact', `Privacy questions: ${supportEmail}.`],
    ],
  },
  refunds: {
    title: 'Refund Policy',
    updated: 'November 20, 2026',
    intro: 'BarnBuddy lists Premium at $5 per month. The application repository does not define a refund procedure or verify how the live billing provider handles refunds.',
    sections: [
      ['Before purchase', 'Review the price and terms shown in Clerk Billing checkout before confirming a subscription. Do not rely on this page as a promise that a particular charge is refundable.'],
      ['Ask about a charge', `For a billing question, contact ${supportEmail} with the account email, charge date, and amount. Do not send full payment card details by email.`],
      ['Legal rights', 'Nothing on this page limits rights that cannot be waived under applicable law.'],
    ],
  },
  cancellation: {
    title: 'Subscription and Cancellation Policy',
    updated: 'November 20, 2026',
    intro: 'Premium is listed at $5 per month. The purchase flow uses Clerk Billing’s monthly plan and premium accounts have a subscription management control in Account Settings.',
    sections: [
      ['Manage or cancel', 'Sign in, open Account Settings, and use Manage billing in the Subscription section. The billing provider’s management screen is the source for the effective cancellation date and any access that remains after cancellation. If you cannot reach it, email support.'],
      ['Renewal and charges', 'The code establishes a monthly plan interval but does not establish all renewal, tax, grace-period, or failed-payment behavior. Review the terms and amount shown in checkout and in the billing provider before confirming.'],
      ['Deleting your account', 'Deleting a BarnBuddy account and canceling a paid subscription are separate actions. Manage the subscription before deleting the account, and confirm cancellation with the billing provider.'],
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    updated: 'November 20, 2026',
    intro: 'BarnBuddy does not currently show a cookie-consent banner because the reviewed site code does not load nonessential analytics or advertising trackers.',
    sections: [
      ['Authentication', 'Clerk provides sign-in and may use cookies or similar browser storage needed to authenticate and maintain a session. Blocking this storage can prevent sign-in from working.'],
      ['App functionality', 'BarnBuddy registers a service worker for the installable web app and stores a contact-form cooldown timestamp in local storage. This is used for app functionality, not advertising.'],
      ['Analytics and preferences', 'No analytics or advertising tags were found in the reviewed client source. There are no optional tracking preferences to change in the current app. If nonessential tracking is added later, BarnBuddy should review consent requirements before enabling it.'],
    ],
  },
  'data-retention': {
    title: 'Data Retention and Deletion Policy',
    updated: 'November 20, 2026',
    intro: 'You can start account deletion from Account Settings. The current workflow deletes the BarnBuddy user and linked database records, then requests deletion of the Clerk identity.',
    sections: [
      ['What the app removes', 'Database deletion removes the user’s animal and herd records and related care, breeding, project, import, preference, and other user-linked records according to the database relationships. It also attempts to remove private uploaded animal images and import files from Cloudflare R2.'],
      ['Deletion limits', 'Object cleanup happens after the database transaction. If Cloudflare R2 rejects a deletion, the application logs the failure but does not automatically retry it. Some chapter advisor contact fields are stored on the chapter independently of the account, and admin activity history may remain with its user reference cleared.'],
      ['Billing and email', 'Account deletion requests Clerk identity deletion and tries to unsubscribe the email from the newsletter provider. If the provider is unavailable, that unsubscribe attempt can fail. The account deletion screen does not currently provide a full account-data export; available PDF exports cover selected records.'],
      ['Backups and legal retention', 'A backup retention period and a general legal-record retention schedule were not specified in the application. Do not assume every copy or third-party record is immediately erased. Contact support for help with an account deletion issue.'],
    ],
  },
  accessibility: {
    title: 'Accessibility Statement',
    updated: 'November 20, 2026',
    intro: 'BarnBuddy aims to make the website and livestock record tools usable with different devices and input methods. A full WCAG 2.2 AA conformance assessment has not been completed.',
    sections: [
      ['Request assistance', `If you encounter an accessibility barrier, email ${supportEmail}. Include the page or workflow and the assistive technology or browser involved if you are comfortable sharing it. Do not include sensitive livestock or student records.`],
      ['Ongoing review', 'The codebase includes keyboard navigation and accessible labels in several common workflows, but some dashboard menus and dialogs still need interaction review. This statement is not a claim of full conformance.'],
    ],
  },
  security: {
    title: 'Security and Data Protection',
    updated: 'November 20, 2026',
    intro: 'BarnBuddy uses third-party infrastructure and server-side authorization to provide its account and record features. This page describes observed controls, not a security certification or guarantee.',
    sections: [
      ['Accounts and access', 'Clerk handles identity and sign-in. Private API routes use authenticated user context, and administrative endpoints apply server-side admin authorization. Record access is scoped through user-owned database records and the relevant chapter-sharing rules.'],
      ['Hosting and storage', 'The application is configured for Railway hosting, PostgreSQL data storage, and Cloudflare R2 object storage. Email uses Resend, and optional AI-assisted import uses OpenAI. Each provider has its own security and retention practices.'],
      ['Protect your account', 'Use a unique password and keep access to your email account secure. Contact support if you believe someone accessed your account or records without permission. Do not email passwords, authentication codes, or full payment details.'],
      ['Limitations', 'The application does not publish a security certification, independent audit, backup schedule, or incident response commitment. Contact support with security concerns.'],
    ],
  },
}

const links = [
  ['Terms', '/terms'], ['Privacy', '/privacy'], ['Refunds', '/refunds'],
  ['Cancellation', '/cancellation'], ['Cookies', '/cookies'],
  ['Data retention', '/data-retention'], ['Accessibility', '/accessibility'], ['Security', '/security'],
]

export default function TOSandPP({ documentType = 'terms' }) {
  const document = documents[documentType] || documents.terms

  return (
    <div className="public-page legal-page flex min-h-screen flex-col text-white">
      <main className="legal-page__main flex-grow px-4 py-10 sm:px-6 lg:py-14">
        <nav className="legal-page__nav mx-auto mb-8 flex max-w-4xl flex-wrap gap-1 rounded-lg border border-white/15 p-1 sm:mb-10" aria-label="Legal documents">
          {links.map(([label, href]) => (
            <Link key={href} to={href} aria-current={href === `/${documentType}` ? 'page' : undefined} className={`rounded-md px-3 py-2 font-semibold transition-colors ${href === `/${documentType}` ? 'bg-blue-600' : 'text-blue-200 hover:bg-white/10'}`}>
              {label}
            </Link>
          ))}
        </nav>

        <article className="legal-page__article mx-auto w-full max-w-4xl rounded-lg border border-white/10 bg-[#0f2650] p-5 sm:p-9 lg:p-12">
          <header className="legal-page__header">
            <h1>{document.title}</h1>
            <p className="legal-page__intro">{document.intro}</p>
            <p className="legal-page__date">Last updated: {document.updated}</p>
          </header>

          <div className="legal-page__sections">
            {document.sections.map(([heading, body], index) => (
              <section key={heading} aria-labelledby={`legal-section-${index}`}>
                <h2 id={`legal-section-${index}`}>{heading}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>

          <p className="legal-page__contact">
            Contact: <a className="underline underline-offset-2" href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  )
}

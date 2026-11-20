import React from "react";
import { Link, useLocation } from "react-router";
import { PricingTable } from "@clerk/react";
import Footer from "../components/Footer";
import { PRICING_FEATURES } from "../config/subscription";

const clerkPricingAppearance = {
  variables: {
    colorBackground: "#0f2650",
    colorModalBackdrop: "#0b1730",
    colorInputBackground: "#111827",
    colorPrimary: "#3b82f6",
    colorText: "#f8fafc",
    colorTextSecondary: "rgba(226, 232, 240, 0.72)",
    colorNeutral: "#64748b",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    pricingTable: {
      backgroundColor: "transparent",
      color: "#f8fafc",
      gap: "1rem",
    },
    pricingTableCard: {
      backgroundColor: "#0f2650",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      boxShadow: "none",
      color: "#f8fafc",
    },
    pricingTableCardHeader: {
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    },
    pricingTableCardTitle: {
      color: "#ffffff",
      fontWeight: "700",
    },
    pricingTableCardDescription: {
      color: "rgba(226, 232, 240, 0.72)",
    },
    pricingTableCardFee: {
      color: "#ffffff",
    },
    pricingTableCardFeePeriod: {
      color: "rgba(226, 232, 240, 0.72)",
    },
    pricingTableCardFeaturesListItem: {
      color: "rgba(248, 250, 252, 0.9)",
    },
    pricingTableCardFooterButton: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
      fontWeight: "700",
      minHeight: "44px",
    },
    pricingTableCardFooterNotice: {
      color: "rgba(226, 232, 240, 0.68)",
    },
    pricingTableMatrix: {
      backgroundColor: "#0f2650",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      color: "#f8fafc",
    },
    pricingTableMatrixTable: {
      color: "#f8fafc",
    },
    pricingTableMatrixRow: {
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    pricingTableMatrixRowHeader: {
      color: "rgba(248, 250, 252, 0.92)",
    },
    pricingTableMatrixCell: {
      color: "rgba(226, 232, 240, 0.78)",
    },
    drawerBackdrop: {
      backgroundColor: "#0b1730",
      opacity: "1",
    },
    drawerRoot: {
      backgroundColor: "#0b1730",
      color: "#f8fafc",
    },
    drawerContent: {
      backgroundColor: "#0b1730",
      borderLeft: "0",
      borderRadius: "0",
      boxShadow: "none",
      color: "#f8fafc",
      height: "100vh",
      maxHeight: "100vh",
      maxWidth: "100vw",
      width: "100vw",
    },
    drawerHeader: {
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      margin: "0 auto",
      maxWidth: "760px",
      width: "100%",
    },
    drawerTitle: {
      color: "#ffffff",
      fontWeight: "700",
    },
    drawerBody: {
      margin: "0 auto",
      maxWidth: "760px",
      width: "100%",
    },
    drawerFooter: {
      backgroundColor: "#0b1730",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      margin: "0 auto",
      maxWidth: "760px",
      width: "100%",
    },
    drawerClose: {
      color: "#f8fafc",
    },
    checkoutFormLineItemsRoot: {
      backgroundColor: "#0f2650",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "0.75rem",
      color: "#f8fafc",
    },
    checkoutFormElementsRoot: {
      backgroundColor: "#0f2650",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "0.75rem",
      color: "#f8fafc",
      padding: "1rem",
    },
    modalBackdrop: {
      backgroundColor: "#0b1730",
      opacity: "1",
    },
    modalContent: {
      backgroundColor: "#0b1730",
      borderRadius: "0",
      color: "#f8fafc",
    },
  },
};

export default function Pricing() {
  const location = useLocation();
  const requestedPremiumFeature = location.state?.premiumFeature || "";

  return (
    <div className="public-page flex min-h-screen flex-col text-white">
      <main className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <header className="bb-route-intro">
            <h1>Plans for your herd</h1>
            <p>Start with Free to keep animal profiles and herd records. Premium adds tools for reminders, exports, and FFA projects.</p>
            <a className="bb-text-link" href="#plan-comparison">Compare Free and Premium</a>
          </header>

          {requestedPremiumFeature && (
            <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-blue-300/25 bg-blue-500/10 px-5 py-4 text-center text-sm text-blue-100">
              <strong>{requestedPremiumFeature}</strong> is included with BarnBuddy Premium. Choose Premium below to unlock it.
            </div>
          )}

          <section
            id="clerk-checkout"
            aria-label="Available plans"
          >
            <PricingTable
              for="user"
              ctaPosition="bottom"
              newSubscriptionRedirectUrl="/dashboard"
              appearance={clerkPricingAppearance}
              checkoutProps={{ appearance: clerkPricingAppearance }}
              fallback={
                <div className="rounded-xl border border-white/10 bg-[#0f2650] p-5 text-sm text-white/70">
                  Loading plans...
                </div>
              }
            />
          </section>

          <section id="plan-comparison" className="mt-12 scroll-mt-24 border-y border-white/15">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <h2 className="text-xl font-semibold">What each plan includes</h2>
            </div>

            <div className="space-y-4 p-4 md:hidden">
              {PRICING_FEATURES.map((feature) => (
                <article key={feature.label} className="border-t border-white/15 py-4">
                  <h3 className="font-semibold leading-snug text-white">{feature.label}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-4">
                    <div className="border-l border-white/20 pl-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Free</dt>
                      <dd className="mt-1.5 text-sm leading-relaxed text-white/75">{feature.free}</dd>
                    </div>
                    <div className="border-l-2 border-blue-400/60 pl-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Premium</dt>
                      <dd className="mt-1.5 text-sm leading-relaxed text-white/90">{feature.premium}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">BarnBuddy Free and Premium feature comparison</caption>
                <thead className="bg-white/8 text-xs uppercase tracking-[0.14em] text-white/60">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Feature</th>
                    <th className="px-5 py-3 font-semibold">Free</th>
                    <th className="px-5 py-3 font-semibold">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {PRICING_FEATURES.map((feature) => (
                    <tr key={feature.label}>
                      <th scope="row" className="px-5 py-4 font-medium text-white">{feature.label}</th>
                      <td className="px-5 py-4 text-white/72">{feature.free}</td>
                      <td className="px-5 py-4 text-white/88">{feature.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-10 grid grid-cols-1 gap-6 rounded-2xl border border-white/10 bg-[#0f2650] p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-xl font-semibold">Schools, chapters, and group licenses</h2>
              <p className="mt-2 text-sm text-white/75">
                Tell us how many people need access and whether your school needs one invoice for the group.
              </p>
            </div>
            <Link
              to="/contact?topic=School%20or%20chapter%20pricing"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Ask about group plans
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

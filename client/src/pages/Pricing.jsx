import React from "react";
import { Link } from "react-router-dom";
import { PricingTable } from "@clerk/clerk-react";
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
      boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
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
  return (
    <div className="flex min-h-screen flex-col bg-[#0b1730] text-white">
      <main className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Pricing</p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Choose your BarnBuddy plan</h1>
            <p className="mt-4 text-white/78">
              Upgrade through Clerk Billing for Premium exports, reminders, planning tools, and deeper herd insight.
            </p>
          </div>

          <section
            id="clerk-checkout"
            className="rounded-2xl border border-white/10 bg-[#0b1730] p-3 shadow-xl shadow-black/25 sm:p-5"
          >
            <PricingTable
              for="user"
              ctaPosition="bottom"
              newSubscriptionRedirectUrl="/dashboard"
              appearance={clerkPricingAppearance}
              checkoutProps={{ appearance: clerkPricingAppearance }}
              fallback={
                <div className="rounded-xl border border-white/10 bg-[#0f2650] p-5 text-sm text-white/70">
                  Loading Clerk plans...
                </div>
              }
            />
          </section>

          <section className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/6">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <h2 className="text-xl font-semibold">Pricing sheet</h2>
              <p className="mt-1 text-sm text-white/68">Compare what is included in each BarnBuddy plan.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
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
                      <td className="px-5 py-4 font-medium text-white">{feature.label}</td>
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
                Discounted plans can include multiple seats, centralized billing, shared farm access, and priority support.
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Contact sales
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

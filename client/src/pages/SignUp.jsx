import React from "react";
import Footer from "../components/Footer";
import { SignUp as ClerkSignUp } from "@clerk/clerk-react";

const authAppearance = {
  variables: {
    colorPrimary: "#2563eb",
    colorBackground: "transparent",
    colorInputBackground: "#102b5a",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.72)",
    colorNeutral: "#ffffff",
    colorDanger: "#f87171",
    borderRadius: "0.5rem",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none bg-transparent",
    card: "w-full bg-transparent shadow-none p-0 border-0 gap-5",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    main: "bg-transparent p-0",
    socialButtons: "grid grid-cols-2 gap-3",
    socialButtonsBlockButton:
      "h-11 bg-white text-slate-900 border border-slate-200 hover:bg-blue-50 rounded-lg shadow-sm transition opacity-100",
    socialButtonsBlockButtonText: "text-slate-900 font-semibold",
    socialButtonsBlockButtonArrow: "text-slate-900",
    dividerRow: "my-5",
    dividerLine: "bg-white/10",
    dividerText: "text-white/60",
    formFieldLabel: "text-white/80",
    formFieldInput:
      "h-11 bg-[#102b5a] text-white border-white/10 placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400 rounded-lg",
    formButtonPrimary:
      "h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm transition",
    footer: "bg-transparent p-0 mt-5",
    footerAction: "bg-transparent",
    footerActionText: "text-white/70",
    footerActionLink: "text-blue-200 hover:text-white font-semibold",
    footerPages: "hidden",
    formFieldAction: "text-blue-200 hover:text-white",
    formFieldErrorText: "text-red-300",
    formFieldSuccessText: "text-emerald-300",
    formFieldWarningText: "text-yellow-300",
    identityPreview: "bg-[#102b5a] border-white/10 text-white rounded-lg",
    identityPreviewText: "text-white",
    userPreviewMainIdentifier: "text-white",
    userPreviewSecondaryIdentifier: "text-white/70",
    otpCodeFieldInput: "bg-[#102b5a] text-white border-white/10",
    alternativeMethodsBlockButton:
      "bg-[#102b5a] border-white/10 text-white hover:bg-[#16376c] rounded-lg",
    alternativeMethodsBlockButtonText: "text-white",
    alert: "bg-[#102b5a] border border-white/10 text-white rounded-lg",
    alertText: "text-white/80",
    formResendCodeLink: "text-blue-200 hover:text-white",
    footerPagesLink: "text-white/60",
    footerPagesText: "text-white/50",
  },
};

export default function SignUp() {
  return (
    <div className="min-h-screen bg-[#0b1730] text-white flex flex-col">
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left: Sign Up form */}
            <div className="lg:col-span-6 flex items-center">
              <div className="w-full max-w-md mx-auto bg-[#0f2650] border border-white/6 rounded-xl p-8 shadow-lg">
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold">Create your account</h1>
                  <p className="mt-2 text-sm text-white/70">
                    Start tracking your animals with one secure sign-in.
                  </p>
                </div>
                <ClerkSignUp
                  routing="hash"
                  signInUrl="/login"
                  fallbackRedirectUrl="/dashboard"
                  appearance={authAppearance}
                />
                <p className="mt-4 text-xs text-white/60">
                  By signing up, you agree to the{" "}
                  <a href="/termsofserviceandprivacypolicy#tos" className="underline">Terms of Service</a>{" "}
                  and{" "}
                  <a href="/termsofserviceandprivacypolicy#pp" className="underline">Privacy Policy</a>.
                </p>
              </div>
            </div>

            {/* Right side info */}
            <div className="lg:col-span-6 flex items-center">
              <div className="w-full max-w-lg mx-auto bg-transparent rounded-xl p-6">
                <h2 className="text-3xl font-semibold mb-4">BarnBuddy.</h2>
                <p className="text-white/80 mb-6">
                  Simple, practical tools for small farms. Built from the farm
                  for the farm — record keeping that actually gets used.
                </p>

                <div className="grid grid-cols-1 gap-4 text-sm text-white/80">
                  <div>
                    <h4 className="font-semibold text-white">Why sign up?</h4>
                    <p className="mt-1">
                      Track your animals, supplies, and tasks with clean,
                      simple tools built for real farm workflows.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">What you'll get</h4>
                    <p className="mt-1">
                      Smart forms, exportable records, and streamlined
                      templates that won't slow you down.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">Privacy first</h4>
                    <p className="mt-1">
                      Your data stays yours. Export anytime and delete your
                      account whenever you want.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-sm text-white/70 mb-3">
                    Have questions?
                  </p>
                  <a
                    href="/contact"
                    className="inline-block bg-white text-blue-700 px-4 py-2 rounded-md font-semibold hover:bg-blue-100"
                  >
                    Contact us
                  </a>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

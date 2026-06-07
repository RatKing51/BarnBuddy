import React from "react";
import { SignIn } from "@clerk/clerk-react";

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
    rootBox: "w-full max-w-full",
    cardBox: "w-full max-w-full shadow-none bg-transparent",
    card: "w-full max-w-full bg-transparent shadow-none p-0 border-0 gap-5",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    main: "bg-transparent p-0",
    socialButtons: "grid grid-cols-1 sm:grid-cols-2 gap-3",
    socialButtonsBlockButton:
      "min-h-11 bg-white text-slate-900 border border-slate-200 hover:bg-blue-50 rounded-lg shadow-sm transition opacity-100",
    socialButtonsBlockButtonText: "text-slate-900 font-semibold",
    socialButtonsBlockButtonArrow: "text-slate-900",
    dividerRow: "my-5",
    dividerLine: "bg-white/10",
    dividerText: "text-white/60",
    formFieldLabel: "text-white/80",
    formFieldInput:
      "min-h-11 bg-[#102b5a] text-white border-white/10 placeholder:text-white/40 focus:border-blue-400 focus:ring-blue-400 rounded-lg",
    formButtonPrimary:
      "min-h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm transition",
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

export default function Login() {
  return (
    <div className="signup-page min-h-screen bg-[#0b1730] text-white">
      <main>
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-10 lg:items-center">
            <div className="flex min-w-0 items-center lg:col-span-5">
              <div className="mx-auto w-full max-w-[25rem] rounded-xl border border-white/10 bg-[#0f2650] p-4 shadow-lg sm:p-8">
                <div className="mb-5 sm:mb-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200 sm:hidden">
                    BarnBuddy.
                  </p>
                  <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                    Welcome back
                  </h1>
                  <p className="mt-2 text-sm text-white/70">
                    Sign in to keep your farm records moving.
                  </p>
                </div>

                <SignIn
                  routing="hash"
                  signUpUrl="/signup"
                  fallbackRedirectUrl="/dashboard"
                  appearance={authAppearance}
                />
              </div>
            </div>

            <div className="flex min-w-0 items-center lg:col-span-7">
              <div className="mx-auto w-full max-w-xl bg-transparent py-2 sm:py-4 lg:p-6">
                <h2 className="hidden text-3xl font-semibold sm:mb-4 sm:block lg:text-4xl">
                  BarnBuddy.
                </h2>
                <p className="hidden text-white/80 sm:mb-6 sm:block sm:text-base">
                  Get back to your dashboard, check upcoming care, and keep
                  records current without extra noise.
                </p>

                <div className="grid grid-cols-1 gap-3 text-sm text-white/80 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:border-0 sm:bg-transparent sm:p-0">
                    <h4 className="font-semibold text-white">Quick check-ins</h4>
                    <p className="mt-1">
                      Jump back into animals, herds, and upcoming care from one dashboard.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:border-0 sm:bg-transparent sm:p-0">
                    <h4 className="font-semibold text-white">Records ready</h4>
                    <p className="mt-1">
                      Keep health notes, vaccinations, vet visits, and exports close at hand.
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:border-0 sm:bg-transparent sm:p-0">
                    <h4 className="font-semibold text-white">Secure access</h4>
                    <p className="mt-1">
                      Your account stays protected while your farm data stays yours.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:mt-8 sm:block">
                  <p className="mb-3 text-sm text-white/70">Need an account?</p>
                  <a
                    href="/signup"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Create account
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

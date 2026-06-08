import React from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { CheckoutButton, SubscriptionDetailsButton } from "@clerk/clerk-react/experimental";
import { CLERK_PREMIUM_PLAN_ID } from "../config/env";

const baseClassName =
  "inline-flex items-center justify-center rounded-lg px-4 py-3 font-semibold transition disabled:cursor-wait disabled:opacity-70";

export default function BillingAction({
  isPremium = false,
  className = "",
  signedOutClassName = "",
  checkoutFallbackToPricing = true,
  fullWidth = false,
}) {
  const classes = `${baseClassName} ${fullWidth ? "w-full" : ""} ${className}`.trim();
  const signedOutClasses = `${baseClassName} ${fullWidth ? "w-full" : ""} ${signedOutClassName || className}`.trim();

  if (isPremium) {
    return (
      <>
        <SignedIn>
          <SubscriptionDetailsButton for="user">
            <button type="button" className={classes}>
              Manage billing
            </button>
          </SubscriptionDetailsButton>
        </SignedIn>
        <SignedOut>
          <Link to="/login" className={signedOutClasses}>
            Sign in
          </Link>
        </SignedOut>
      </>
    );
  }

  if (!CLERK_PREMIUM_PLAN_ID && checkoutFallbackToPricing) {
    return (
      <>
        <SignedIn>
          <Link to="/pricing#clerk-checkout" className={classes}>
            Choose Premium
          </Link>
        </SignedIn>
        <SignedOut>
          <Link to="/signup" className={signedOutClasses}>
            Create account
          </Link>
        </SignedOut>
      </>
    );
  }

  return (
    <>
      <SignedIn>
        <CheckoutButton
          planId={CLERK_PREMIUM_PLAN_ID}
          planPeriod="month"
          for="user"
          newSubscriptionRedirectUrl="/dashboard"
          onSubscriptionComplete={() => {
            window.setTimeout(() => window.location.assign("/dashboard"), 250);
          }}
        >
          <button type="button" className={classes}>
            Upgrade to Premium
          </button>
        </CheckoutButton>
      </SignedIn>
      <SignedOut>
        <Link to="/signup" className={signedOutClasses}>
          Create account
        </Link>
      </SignedOut>
    </>
  );
}

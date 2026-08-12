import React from "react";
import { Link } from "react-router";
import { Show } from "@clerk/react";
import { CheckoutButton, SubscriptionDetailsButton } from "@clerk/react/experimental";
import { CLERK_PREMIUM_PLAN_ID, HAS_VALID_CLERK_PREMIUM_PLAN_ID } from "../config/env";

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
        <Show when="signed-in">
          <SubscriptionDetailsButton for="user">
            <button type="button" className={classes}>
              Manage billing
            </button>
          </SubscriptionDetailsButton>
        </Show>
        <Show when="signed-out">
          <Link to="/login" className={signedOutClasses}>
            Sign in
          </Link>
        </Show>
      </>
    );
  }

  if (!HAS_VALID_CLERK_PREMIUM_PLAN_ID && checkoutFallbackToPricing) {
    return (
      <>
        <Show when="signed-in">
          <Link to="/pricing#clerk-checkout" className={classes}>
            Choose Premium
          </Link>
        </Show>
        <Show when="signed-out">
          <Link to="/signup" className={signedOutClasses}>
            Create account
          </Link>
        </Show>
      </>
    );
  }

  return (
    <>
      <Show when="signed-in">
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
      </Show>
      <Show when="signed-out">
        <Link to="/signup" className={signedOutClasses}>
          Create account
        </Link>
      </Show>
    </>
  );
}

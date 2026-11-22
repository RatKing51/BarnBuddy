import { Link, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function PremiumRoute() {
  const { subscription } = useAuth();

  if (!subscription?.isPremium) {
    return (
      <main className="bb-livestock min-h-screen py-8">
        <div className="bb-work-container">
          <Link
            to="/dashboard"
            className="bb-action"
          >
            Back to dashboard
          </Link>

          <div className="bb-record-panel bb-panel-inset mt-6">
            <h1 className="mt-2 text-xl font-semibold text-white">
              FFA Project Mode is a Premium feature
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">
              Upgrade to create FFA and SAE projects, track hours and finances, and connect project animals.
            </p>
            <Link
              to="/pricing"
              state={{ premiumFeature: "FFA Project Mode", returnTo: "/dashboard/ffa-projects" }}
              className="bb-action bb-action-primary mt-5"
            >
              View Premium
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
}

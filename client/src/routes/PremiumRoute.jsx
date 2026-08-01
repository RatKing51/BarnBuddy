import { Link, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

export default function PremiumRoute() {
  const { subscription } = useAuth();

  if (!subscription?.isPremium) {
    return (
      <main className="min-h-screen bg-gray-950 px-4 py-8 text-gray-100 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/dashboard"
            className="inline-flex rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-600 hover:bg-gray-800"
          >
            Back to dashboard
          </Link>

          <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
              Premium
            </p>
            <h1 className="mt-2 text-xl font-semibold text-white">
              FFA Project Mode is a Premium feature
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">
              Upgrade to create FFA and SAE projects, track hours and finances, and connect project animals.
            </p>
            <Link
              to="/pricing"
              state={{ premiumFeature: "FFA Project Mode", returnTo: "/dashboard/ffa-projects" }}
              className="mt-5 inline-flex rounded-lg bg-amber-300 px-4 py-2 font-semibold text-gray-950 transition hover:bg-amber-200"
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

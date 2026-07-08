import { Navigate, Outlet, useLocation }  from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useAuth as useBarnBuddyAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";

export default function PrivateRoute() {
    const location = useLocation();
    const { isLoaded, isSignedIn } = useClerkAuth();
    const { backendAuthLoading, backendAuthError, backendUser } = useBarnBuddyAuth();

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-[#0b1730]">
                <LoadingSpinner label="Checking your session..." />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ returnTo: `${location.pathname}${location.search}${location.hash}` }}
            />
        );
    }

    if (backendAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-[#0b1730]">
                <LoadingSpinner label="Preparing your BarnBuddy account..." />
            </div>
        );
    }

    if (backendAuthError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b1730] px-4 text-white">
                <div className="max-w-md rounded-xl border border-red-400/30 bg-red-950/40 p-6 text-center">
                    <h1 className="text-xl font-semibold">Account sync failed</h1>
                    <p className="mt-3 text-sm text-red-100">
                        Clerk signed you in, but BarnBuddy could not create your local account yet.
                    </p>
                    <p className="mt-3 text-xs text-red-200/80">
                        {backendAuthError.message}
                    </p>
                </div>
            </div>
        );
    }

    const onboardingCompleted = backendUser?.onboarding?.completed === true;
    const isOnboardingRoute = location.pathname === "/dashboard/onboarding";

    if (!onboardingCompleted && !isOnboardingRoute) {
        return <Navigate to="/dashboard/onboarding" replace />;
    }

    if (onboardingCompleted && isOnboardingRoute) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

import { Navigate, Outlet, useLocation }  from "react-router";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useAuth as useBarnBuddyAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";

function getInvitationAuthDestination(location) {
    const params = new URLSearchParams(location.search);
    if (!params.get("__clerk_ticket")) return null;

    const authPath = params.get("__clerk_status") === "sign_up" ? "/signup" : "/login";
    params.set("returnTo", location.pathname || "/dashboard");
    return `${authPath}?${params.toString()}`;
}

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
        const invitationDestination = getInvitationAuthDestination(location);
        return (
            <Navigate
                to={invitationDestination || "/login"}
                replace
                state={invitationDestination ? undefined : {
                    returnTo: `${location.pathname}${location.search}${location.hash}`,
                }}
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

    const onboardingRequired = backendUser?.onboarding?.required === true;
    const onboardingCompleted = backendUser?.onboarding?.completed === true;
    const isOnboardingRoute = location.pathname === "/dashboard/onboarding";
    const advisorOnboardingReturnTo = location.state?.returnTo === "/advisor"
        ? "/advisor"
        : null;

    if (onboardingRequired && !onboardingCompleted && !isOnboardingRoute) {
        return (
            <Navigate
                to="/dashboard/onboarding"
                replace
                state={location.pathname === "/advisor" ? { returnTo: "/advisor" } : undefined}
            />
        );
    }

    if ((!onboardingRequired || onboardingCompleted) && isOnboardingRoute) {
        return <Navigate to={advisorOnboardingReturnTo || "/dashboard"} replace />;
    }

    return <Outlet />;
}

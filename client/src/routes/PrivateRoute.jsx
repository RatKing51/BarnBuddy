import { Navigate, Outlet }  from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { LoadingSpinner } from "../components/LoadingSpinner";

export default function PrivateRoute() {
    const { isLoaded, isSignedIn } = useAuth();

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-[#0b1730]">
                <LoadingSpinner label="Checking your session..." />
            </div>
        );
    }

    if (!isSignedIn) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

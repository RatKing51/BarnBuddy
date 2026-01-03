import { Navigate, Outlet }  from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-[#0b1730]">
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
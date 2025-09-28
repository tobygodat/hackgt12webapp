import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse">
                        <div className="text-2xl font-bold text-text mb-2">
                            CartWatch
                        </div>
                        <div className="text-text-muted">
                            Loading your financial twin...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/signin" replace />;
    }

    return children;
}

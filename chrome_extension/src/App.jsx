import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx";
import { useAuth } from "./hooks/useAuth.js";

function App() {
    const { loading } = useAuth();

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

    return <RouterProvider router={router} />;
}

export default App;

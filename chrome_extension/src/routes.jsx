import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import Insights from "./pages/Insights.jsx";
import Profile from "./pages/Profile.jsx";
import SimulationDetail from "./pages/SimulationDetail.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";

export const router = createBrowserRouter([
    {
        path: "/signin",
        element: (
            <PublicRoute>
                <SignIn />
            </PublicRoute>
        ),
    },
    {
        path: "/signup",
        element: (
            <PublicRoute>
                <SignUp />
            </PublicRoute>
        ),
    },
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Insights />,
            },
            {
                path: "insights",
                element: <Insights />,
            },
            {
                path: "profile",
                element: <Profile />,
            },
            {
                path: "simulation/:id",
                element: <SimulationDetail />,
            },
        ],
    },
]);

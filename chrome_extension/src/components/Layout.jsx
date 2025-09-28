import { Outlet, NavLink } from "react-router-dom";
import { Home, CreditCard, TrendingUp, User, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";

export default function Layout() {
    const { user, logout } = useAuth();

    const navItems = [
        { to: "/", icon: Home, label: "Dashboard" },
        { to: "/transactions", icon: CreditCard, label: "Transactions" },
        { to: "/insights", icon: TrendingUp, label: "Insights" },
        { to: "/profile", icon: User, label: "Profile" },
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <div className="min-h-screen bg-bg">
            <nav className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-text">
                                CartWatch
                            </h1>
                        </div>
                        <div className="flex items-center space-x-8">
                            <div className="flex space-x-8">
                                {navItems.map(({ to, icon: Icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        className={({ isActive }) =>
                                            `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                isActive
                                                    ? "text-text bg-surfaceAlt"
                                                    : "text-text-muted hover:text-text hover:bg-surface"
                                            }`
                                        }
                                    >
                                        <Icon size={18} />
                                        <span>{label}</span>
                                    </NavLink>
                                ))}
                            </div>

                            <div className="flex items-center space-x-4 pl-4 border-l border-border">
                                <span className="text-sm text-text-muted">
                                    {user?.email?.replace(
                                        "@cartwatch.local",
                                        ""
                                    ) ||
                                        user?.username ||
                                        "User"}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-text-muted hover:text-text hover:bg-surface transition-colors"
                                    title="Sign out"
                                >
                                    <LogOut size={18} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Card from "../components/Card.jsx";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function SignIn() {
    const navigate = useNavigate();
    const { signIn, loading } = useAuth();
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            await signIn(formData.email, formData.password);
            navigate("/");
        } catch (err) {
            console.error("Sign in failed:", err);
            // Provide more user-friendly error messages using Firebase error codes
            const code = err?.code || "";
            if (code === "auth/user-not-found") {
                setError(
                    "No account found with this email. Please sign up first."
                );
            } else if (
                code === "auth/invalid-credential" ||
                code === "auth/wrong-password"
            ) {
                setError(
                    "Invalid email or password. Please check your credentials."
                );
            } else if (code === "auth/invalid-email") {
                setError("Invalid email format. Please try again.");
            } else if (code === "auth/too-many-requests") {
                setError("Too many attempts. Please wait a bit and try again.");
            } else {
                setError(err.message || "Sign in failed.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse">
                        <div className="text-2xl font-bold text-text mb-2">
                            CartWatch
                        </div>
                        <div className="text-text-muted">Loading...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-text mb-2">
                        CartWatch
                    </h1>
                    <p className="text-text-muted">Your Financial Twin</p>
                </div>

                <Card title="Sign In" className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-text mb-2"
                            >
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="Enter your email"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-text mb-2"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input w-full pr-10"
                                    placeholder="Enter your password"
                                    required
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                                    disabled={isSubmitting}
                                >
                                    {showPassword ? (
                                        <EyeOff size={20} />
                                    ) : (
                                        <Eye size={20} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full flex items-center justify-center space-x-2"
                            disabled={isSubmitting}
                        >
                            <LogIn size={20} />
                            <span>
                                {isSubmitting ? "Signing In..." : "Sign In"}
                            </span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-text-muted">
                            Don&apos;t have an account?{" "}
                            <Link
                                to="/signup"
                                className="text-text hover:opacity-80 font-medium"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

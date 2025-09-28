import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import Card from "../components/Card.jsx";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export default function SignUp() {
    const navigate = useNavigate();
    const { signUp, loading } = useAuth();
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setIsSubmitting(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters long");
            setIsSubmitting(false);
            return;
        }

        try {
            await signUp(formData.username, formData.password);
            navigate("/");
        } catch (err) {
            console.error("Sign up failed:", err);
            const code = err?.code || "";
            if (code === "auth/email-already-in-use") {
                setError(
                    "This username is already taken. Please choose another."
                );
            } else if (code === "auth/invalid-email") {
                setError("Invalid username format. Please try again.");
            } else if (code === "auth/weak-password") {
                setError(
                    "Password is too weak. Please use at least 6 characters."
                );
            } else {
                setError(err.message || "Sign up failed.");
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
                    <p className="text-text-muted">
                        Create Your Financial Twin
                    </p>
                </div>

                <Card title="Sign Up" className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-text mb-2"
                            >
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="Choose a username"
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
                                    placeholder="Choose a password"
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
                            <p className="text-xs text-text-muted mt-1">
                                Password must be at least 6 characters long
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-text mb-2"
                            >
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="input w-full pr-10"
                                    placeholder="Confirm your password"
                                    required
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                                    disabled={isSubmitting}
                                >
                                    {showConfirmPassword ? (
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
                            <UserPlus size={20} />
                            <span>
                                {isSubmitting
                                    ? "Creating Account..."
                                    : "Sign Up"}
                            </span>
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-text-muted">
                            Already have an account?{" "}
                            <Link
                                to="/signin"
                                className="text-text hover:opacity-80 font-medium"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

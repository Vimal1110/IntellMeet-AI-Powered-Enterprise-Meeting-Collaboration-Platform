import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/login", {
        email: email.trim(),
        password,
      });

      if (!res.data?.token) {
        setError("Login successful, but authentication token was not received.");
        return;
      }

      localStorage.setItem("token", res.data.token);

      // Keep user data available for other pages if backend provides it
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      setSuccess("Login successful! Redirecting...");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 500);
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Login failed. Please check your email and password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8">

      {/* Main Card */}
      <div className="w-full max-w-md">

        {/* Back Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-cyan-400 transition flex items-center gap-2"
          >
            <span className="text-xl">←</span>
            Back
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <span className="text-3xl">🔐</span>
            </div>

            <h1 className="text-4xl font-bold text-white">
              Welcome Back
            </h1>

            <p className="text-gray-400 mt-2">
              Sign in to continue to IntelliMeet
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">
              ❌ {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 bg-green-500/10 border border-green-500/40 text-green-300 px-4 py-3 rounded-lg text-sm">
              ✅ {success}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>

            {/* Email */}
            <div className="mb-5">
              <label className="block text-gray-300 font-medium mb-2">
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                className="w-full p-3.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>

            {/* Password */}
            <div className="mb-2">
              <label className="block text-gray-300 font-medium mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                  className="w-full p-3.5 pr-20 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end mb-6 mt-3">
              <Link
                to="/forgot-password"
                className="text-cyan-400 hover:text-cyan-300 hover:underline text-sm transition"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-lg font-semibold text-white transition ${
                loading
                  ? "bg-cyan-700 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-600"
              }`}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Register */}
          <p className="text-center text-gray-400">
            Don't have an account?
            <Link
              to="/register"
              className="text-cyan-400 ml-2 hover:text-cyan-300 hover:underline font-medium"
            >
              Create Account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-5">
          © {new Date().getFullYear()} IntelliMeet. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default Login;
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getPasswordStrength = () => {
    if (!password) {
      return {
        text: "",
        color: "",
        width: "0%",
      };
    }

    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        text: "Weak password",
        color: "bg-red-500",
        width: "25%",
      };
    }

    if (score <= 3) {
      return {
        text: "Medium password",
        color: "bg-yellow-500",
        width: "60%",
      };
    }

    return {
      text: "Strong password",
      color: "bg-green-500",
      width: "100%",
    };
  };

  const passwordStrength = getPasswordStrength();

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }

    if (trimmedName.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/register", {
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      if (!res.data?.token) {
        setError(
          "Registration completed, but authentication token was not received.",
        );
        return;
      }

      localStorage.setItem("token", res.data.token);

      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      setSuccess("Account created successfully! Redirecting...");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 700);
    } catch (err) {
      console.error("REGISTER ERROR:", err);

      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleRegister(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8">

      {/* Main Container */}
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

        {/* Register Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>

            <h1 className="text-4xl font-bold text-white">
              Create Account
            </h1>

            <p className="text-gray-400 mt-2">
              Join IntelliMeet and start collaborating
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

          {/* Form */}
          <form onSubmit={handleRegister}>

            {/* Name */}
            <div className="mb-5">
              <label className="block text-gray-300 font-medium mb-2">
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
                autoComplete="name"
                className="w-full p-3.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>

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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="new-password"
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

              {/* Password Strength */}
              {password && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{
                        width: passwordStrength.width,
                      }}
                    ></div>
                  </div>

                  <p className="text-xs text-gray-400 mt-1">
                    {passwordStrength.text}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mt-5 mb-6">
              <label className="block text-gray-300 font-medium mb-2">
                Confirm Password
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  autoComplete="new-password"
                  className="w-full p-3.5 pr-20 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-gray-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

              {confirmPassword && (
                <p
                  className={`text-xs mt-2 ${
                    password === confirmPassword
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {password === confirmPassword
                    ? "✓ Passwords match"
                    : "✕ Passwords do not match"}
                </p>
              )}
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-lg font-semibold text-white transition ${
                loading
                  ? "bg-cyan-700 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-600"
              }`}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* Login */}
          <p className="text-center text-gray-400">
            Already have an account?
            <Link
              to="/login"
              className="text-cyan-400 ml-2 hover:text-cyan-300 hover:underline font-medium"
            >
              Login
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

export default Register;
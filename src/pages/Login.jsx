import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }

    setError("");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center">

      <div className="bg-slate-900 p-8 rounded-xl w-96">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-slate-800"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-2 rounded bg-slate-800"
        />

        {error && (
          <p className="text-red-400 mb-4 text-sm">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          className="w-full bg-cyan-500 p-3 rounded hover:bg-cyan-600 transition"
        >
          Login
        </button>

        <p className="mt-4 text-center text-gray-400">
          Don't have an account?
          <Link
            to="/register"
            className="text-cyan-400 ml-2 hover:underline"
          >
            Register
          </Link>
        </p>

      </div>

    </div>
  );
}

export default Login;
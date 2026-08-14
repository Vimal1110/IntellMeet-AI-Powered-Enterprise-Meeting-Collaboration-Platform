import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/auth/me");

        setUser(res.data);
        setName(res.data.name || "");

        const cached = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...cached,
            ...res.data,
          })
        );
      } catch (err) {
        console.log(err);

        setError(
          err.response?.data?.message ||
            "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await API.put("/auth/me", {
        name: name.trim(),
      });

      setUser(res.data);

      const cached = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...cached,
          ...res.data,
        })
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      console.log(err);

      setError(
        err.response?.data?.message ||
          "Failed to save changes"
      );
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const fullName = name || user?.name || user?.email || "User";

    const parts = fullName
      .trim()
      .split(" ")
      .filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }

    return fullName.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

          <p className="text-slate-300">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4 px-4">
        <p className="text-red-400 text-lg">
          {error || "Could not load profile"}
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          className="bg-cyan-500 hover:bg-cyan-600 px-5 py-2 rounded-lg font-semibold"
        >
          ← Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8">

      {/* Top Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">

        <div>
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-wider">
            Account
          </p>

          <h1 className="text-4xl font-bold mt-1">
            User Profile
          </h1>

          <p className="text-slate-400 mt-2">
            Manage your IntelliMeet account information
          </p>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="bg-cyan-500 hover:bg-cyan-600 px-5 py-3 rounded-xl font-semibold transition"
        >
          ← Dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto">

        {/* Profile Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl mb-6">

          <div className="flex flex-col md:flex-row items-center gap-6">

            {/* Avatar */}
            <div className="relative">

              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-4xl font-bold shadow-lg shadow-cyan-500/20">
                {getInitials()}
              </div>

              <div className="absolute bottom-1 right-1 w-7 h-7 bg-green-500 border-4 border-slate-900 rounded-full"></div>
            </div>

            {/* Profile Heading */}
            <div className="text-center md:text-left flex-1">

              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h2 className="text-3xl font-bold">
                  {name || user.name || "User"}
                </h2>

                <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-sm font-semibold w-fit mx-auto md:mx-0">
                  ● Active
                </span>
              </div>

              <p className="text-slate-400 mt-2">
                {user.email}
              </p>

              <div className="mt-3">
                <span className="inline-block bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-1.5 rounded-full text-sm font-semibold">
                  {user.role || "Member"}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Profile Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition">
            <div className="text-3xl mb-3">
              📅
            </div>

            <p className="text-2xl font-bold">
              —
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Meetings Hosted
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition">
            <div className="text-3xl mb-3">
              👥
            </div>

            <p className="text-2xl font-bold">
              —
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Meetings Joined
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition">
            <div className="text-3xl mb-3">
              🤖
            </div>

            <p className="text-2xl font-bold">
              —
            </p>

            <p className="text-slate-400 text-sm mt-1">
              AI Summaries
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-cyan-500/40 transition">
            <div className="text-3xl mb-3">
              ⏱️
            </div>

            <p className="text-2xl font-bold">
              —
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Meeting Time
            </p>
          </div>

        </div>

        {/* Personal Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl mb-6">

          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              👤 Personal Information
            </h2>

            <p className="text-slate-400 mt-1">
              Update your basic account information
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/40 text-red-300 p-4 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">

            {/* Name */}
            <div>
              <label className="text-slate-300 font-semibold block mb-2">
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-cyan-400 focus:outline-none text-white transition"
                placeholder="Enter your name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-slate-300 font-semibold block mb-2">
                Email Address
              </label>

              <div className="w-full p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400">
                {user.email}
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-slate-300 font-semibold block mb-2">
                Role
              </label>

              <div className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-cyan-400 font-semibold">
                {user.role || "Member"}
              </div>
            </div>

            {/* Account Status */}
            <div>
              <label className="text-slate-300 font-semibold block mb-2">
                Account Status
              </label>

              <div className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-green-400 font-semibold">
                ● Active
              </div>
            </div>

          </div>

          {/* Save */}
          <div className="mt-6 flex flex-wrap items-center gap-4">

            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                saving
                  ? "bg-green-700 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>

            {saved && (
              <span className="text-green-400 font-semibold">
                ✓ Profile updated successfully
              </span>
            )}

          </div>
        </div>

        {/* Account Settings */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">

          {/* Notifications */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-2">
              ⚙️ Account Settings
            </h2>

            <p className="text-slate-400 text-sm mb-5">
              Manage your IntelliMeet preferences
            </p>

            <div className="space-y-4">

              <div className="flex items-center justify-between bg-slate-800/70 p-4 rounded-xl">
                <div>
                  <p className="font-semibold">
                    Email Notifications
                  </p>

                  <p className="text-xs text-slate-400">
                    Receive important account updates
                  </p>
                </div>

                <span className="text-green-400 font-semibold">
                  ON
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-800/70 p-4 rounded-xl">
                <div>
                  <p className="font-semibold">
                    Meeting Reminders
                  </p>

                  <p className="text-xs text-slate-400">
                    Get reminders for scheduled meetings
                  </p>
                </div>

                <span className="text-green-400 font-semibold">
                  ON
                </span>
              </div>

            </div>
          </div>

          {/* Security */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

            <h2 className="text-xl font-bold mb-2">
              🔐 Security
            </h2>

            <p className="text-slate-400 text-sm mb-5">
              Keep your account secure
            </p>

            <div className="bg-slate-800/70 p-4 rounded-xl">

              <p className="font-semibold">
                Account Password
              </p>

              <p className="text-slate-400 text-sm mt-1">
                Your password is securely protected.
              </p>

              <button
                type="button"
                className="mt-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Change Password
              </button>

            </div>
          </div>

        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">

          <h2 className="text-2xl font-bold">
            🕐 Recent Activity
          </h2>

          <p className="text-slate-400 mt-1 mb-6">
            Your recent IntelliMeet activity
          </p>

          <div className="space-y-4">

            <div className="flex items-center gap-4 bg-slate-800/60 p-4 rounded-xl">

              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                ✓
              </div>

              <div>
                <p className="font-semibold">
                  Profile loaded successfully
                </p>

                <p className="text-sm text-slate-400">
                  Your account information is up to date
                </p>
              </div>

            </div>

            <div className="flex items-center gap-4 bg-slate-800/60 p-4 rounded-xl">

              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                👤
              </div>

              <div>
                <p className="font-semibold">
                  Account Active
                </p>

                <p className="text-sm text-slate-400">
                  You are currently an active IntelliMeet member
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* Bottom Dashboard Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-cyan-500 hover:bg-cyan-600 px-7 py-3 rounded-xl font-semibold transition"
          >
            ← Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}

export default Profile;
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();

  const [name, setName] = useState("Vimal Kumar");
  const [email, setEmail] = useState("vimal@gmail.com");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

      <div className="bg-slate-900 border border-cyan-500 p-8 rounded-2xl shadow-xl w-[450px]">

        <h1 className="text-4xl font-bold text-center text-white mb-6">
          User Profile
        </h1>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-cyan-500 flex items-center justify-center text-4xl font-bold text-white">
            {name.charAt(0)}
          </div>
        </div>

        {/* Name */}
        <label className="text-gray-300 font-semibold">
          Name
        </label>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mt-2 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
        />

        {/* Email */}
        <label className="text-gray-300 font-semibold mt-4 block">
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-2 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
        />

        {/* Role */}
        <label className="text-gray-300 font-semibold mt-4 block">
          Role
        </label>

        <div className="mt-2 bg-slate-800 p-3 rounded-lg text-cyan-400 font-semibold">
          Research Engineer Trainee
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mt-4 bg-green-600 text-white text-center py-2 rounded-lg">
            Profile Updated Successfully ✅
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-6">

          <button
            onClick={handleSave}
            className="bg-green-500 hover:bg-green-600 py-3 rounded-lg font-semibold text-white"
          >
            Save Changes
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="bg-cyan-500 hover:bg-cyan-600 py-3 rounded-lg font-semibold text-white"
          >
            ← Dashboard
          </button>

        </div>

      </div>

    </div>
  );
}

export default Profile;
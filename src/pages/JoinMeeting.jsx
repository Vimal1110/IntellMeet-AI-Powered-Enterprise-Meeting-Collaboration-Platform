import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function JoinMeeting() {
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [meetingCode, setMeetingCode] = useState("");

  // User Home se aaya ya Dashboard se
  const from = location.state?.from || "/dashboard";

  const handleJoin = () => {
    if (!name.trim() || !meetingCode.trim()) {
      alert("Please enter your Name and Meeting Code");
      return;
    }

    // Direct Meeting Room
    navigate("/meetingroom", {
      state: {
        name,
        meetingCode,
        from,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-cyan-500 p-8 rounded-2xl shadow-xl w-[420px]">

        <h1 className="text-4xl font-bold text-center text-white mb-6">
          Join Meeting
        </h1>

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white mb-4"
        />

        <input
          type="text"
          placeholder="Meeting Code"
          value={meetingCode}
          onChange={(e) => setMeetingCode(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
        />

        <button
          onClick={handleJoin}
          className="w-full mt-6 bg-cyan-500 hover:bg-cyan-600 py-3 rounded-lg font-semibold text-white"
        >
          Join Meeting
        </button>

        <button
          onClick={() => navigate(from)}
          className="w-full mt-3 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-semibold text-white"
        >
          ← Back
        </button>

      </div>
    </div>
  );
}

export default JoinMeeting;
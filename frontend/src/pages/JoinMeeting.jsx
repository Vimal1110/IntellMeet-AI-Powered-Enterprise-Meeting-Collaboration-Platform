import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";

function JoinMeeting() {
  const navigate = useNavigate();
  const location = useLocation();

  const [meetingCode, setMeetingCode] = useState("");

  // User Home se aaya ya Dashboard se
  const from = location.state?.from || "/dashboard";

  const handleJoin = async () => {
    const trimmedCode = meetingCode.trim();

    if (!trimmedCode) {
      alert("Please enter Meeting Code");
      return;
    }

    try {
      // FIX: send the uppercased, trimmed code. generateMeetingCode() on
      // the backend always produces uppercase alphanumeric codes, so
      // normalizing here means what's typed/pasted (including stray
      // whitespace or lowercase letters) still matches.
      const res = await API.post("/meetings/join", {
        code: trimmedCode.toUpperCase(),
      });

      navigate("/meetingroom", {
        state: {
          meeting: res.data,
        },
      });
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || "Failed to join meeting");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-cyan-500 p-8 rounded-2xl shadow-xl w-[420px]">
        <h1 className="text-4xl font-bold text-center text-white mb-6">
          Join Meeting
        </h1>

        <input
          type="text"
          placeholder="Meeting Code"
          value={meetingCode}
          onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white uppercase tracking-wider"
          maxLength={6}
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

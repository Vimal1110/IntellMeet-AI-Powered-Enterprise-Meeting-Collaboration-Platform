import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function CreateMeeting() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/dashboard";

  const [meetingTitle, setMeetingTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState("Private");

  const meetingId =
    "INT-" + Math.floor(100000 + Math.random() * 900000);

  const handleCreateMeeting = () => {
    if (!meetingTitle.trim()) {
      alert("Please enter Meeting Title");
      return;
    }

    navigate("/meetingroom", {
      state: {
        meetingTitle,
        description,
        meetingDate,
        meetingType,
        meetingId,
        from,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-slate-900 border border-cyan-500 rounded-2xl p-8 shadow-2xl">

        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Create Meeting
        </h1>

        {/* Meeting Title */}
        <input
          type="text"
          placeholder="Meeting Title"
          value={meetingTitle}
          onChange={(e) => setMeetingTitle(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white mb-4 focus:outline-none focus:border-cyan-500"
        />

        {/* Description */}
        <textarea
          placeholder="Meeting Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-24 p-3 rounded-lg bg-slate-800 border border-slate-700 text-white mb-4 focus:outline-none focus:border-cyan-500"
        />

        {/* Date & Time */}
        <input
          type="datetime-local"
          value={meetingDate}
          onChange={(e) => setMeetingDate(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white mb-4 focus:outline-none focus:border-cyan-500"
        />

        {/* Meeting Type */}
        <select
          value={meetingType}
          onChange={(e) => setMeetingType(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white mb-4 focus:outline-none focus:border-cyan-500"
        >
          <option>Private</option>
          <option>Public</option>
        </select>

        {/* Meeting ID */}
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <p className="text-gray-400 text-sm">
            Generated Meeting ID
          </p>

          <h3 className="text-cyan-400 font-bold text-lg">
            {meetingId}
          </h3>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateMeeting}
          className="w-full bg-cyan-500 hover:bg-cyan-600 py-3 rounded-lg font-bold text-white transition"
        >
          Create Meeting
        </button>

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="w-full mt-3 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold text-white transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

export default CreateMeeting;
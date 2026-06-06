import { useNavigate } from "react-router-dom";

function MeetingDetails() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          Meeting Details
        </h1>

        <button
          onClick={() => navigate("/meeting-history")}
          className="bg-cyan-500 px-4 py-2 rounded-lg"
        >
          Back
        </button>
      </div>

      <div className="bg-slate-900 p-8 rounded-xl">

        <h2 className="text-2xl font-bold mb-6">
          Project Review
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <p className="text-gray-400">Date</p>
            <p>10 June 2026</p>
          </div>

          <div>
            <p className="text-gray-400">Duration</p>
            <p>45 Minutes</p>
          </div>

          <div>
            <p className="text-gray-400">Participants</p>
            <p>5 Members</p>
          </div>

          <div>
            <p className="text-gray-400">Status</p>
            <p className="text-green-400">Completed</p>
          </div>

        </div>

        <div className="mt-8">

          <h3 className="text-xl font-bold mb-4">
            Participants List
          </h3>

          <ul className="space-y-2">
            <li>👤 Vimal</li>
            <li>👤 Sahil</li>
            <li>👤 Shruti</li>
            <li>👤 Aadi</li>
            <li>👤 Yogesh</li>
          </ul>

        </div>

        <div className="flex gap-4 mt-8">

          <button
            onClick={() => navigate("/ai-summary")}
            className="bg-purple-600 px-5 py-3 rounded-lg"
          >
            AI Summary
          </button>

          <button
            onClick={() => navigate("/recording")}
            className="bg-red-500 px-5 py-3 rounded-lg"
          >
            Recording
          </button>

        </div>

      </div>

    </div>
  );
}

export default MeetingDetails;
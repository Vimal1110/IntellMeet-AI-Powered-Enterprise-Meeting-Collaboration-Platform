import { useNavigate } from "react-router-dom";

function AISummary() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <div className="flex justify-between mb-8">
        <h1 className="text-4xl font-bold">AI Summary</h1>

        <button
          onClick={() => navigate("/meeting-details")}
          className="bg-cyan-500 px-4 py-2 rounded-lg"
        >
          Back
        </button>
      </div>

      <div className="bg-slate-900 p-8 rounded-xl">
        <h2 className="text-2xl font-bold mb-4">
          Project Review Summary
        </h2>

        <ul className="space-y-3 text-gray-300">
          <li>✅ Sprint progress reviewed</li>
          <li>✅ UI design approved</li>
          <li>✅ Backend integration discussed</li>
          <li>✅ Tasks assigned to team members</li>
          <li>✅ Next meeting scheduled</li>
        </ul>
      </div>

    </div>
  );
}

export default AISummary;
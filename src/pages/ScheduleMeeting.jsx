import { useNavigate } from "react-router-dom";

function ScheduleMeeting() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">

      <div className="bg-slate-900 p-8 rounded-2xl w-[450px]">

        <h1 className="text-3xl font-bold mb-6 text-center">
          Schedule Meeting
        </h1>

        <input
          type="text"
          placeholder="Meeting Title"
          className="w-full p-3 mb-4 rounded-lg bg-slate-800"
        />

        <input
          type="date"
          className="w-full p-3 mb-4 rounded-lg bg-slate-800"
        />

        <input
          type="time"
          className="w-full p-3 mb-4 rounded-lg bg-slate-800"
        />

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full bg-green-500 py-3 rounded-lg font-semibold"
        >
          Schedule Meeting
        </button>

      </div>

    </div>
  );
}

export default ScheduleMeeting;
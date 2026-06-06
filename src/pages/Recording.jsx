import { useNavigate } from "react-router-dom";

function Recording() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <div className="flex justify-between mb-8">
        <h1 className="text-4xl font-bold">
          Meeting Recording
        </h1>

        <button
          onClick={() => navigate("/meeting-details")}
          className="bg-cyan-500 px-4 py-2 rounded-lg"
        >
          Back
        </button>
      </div>

      <div className="bg-slate-900 rounded-xl p-10 text-center">

        <div className="text-7xl mb-4">
          🎥
        </div>

        <h2 className="text-2xl font-bold">
          Recording Available
        </h2>

        <p className="text-gray-400 mt-3">
          Project Review Recording
        </p>

        <button className="bg-red-500 px-6 py-3 rounded-xl mt-6">
          ▶ Play Recording
        </button>

      </div>

    </div>
  );
}

export default Recording;
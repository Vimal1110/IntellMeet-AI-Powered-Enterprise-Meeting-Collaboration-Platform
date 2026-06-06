import { useNavigate, useLocation } from "react-router-dom";

function MeetingRoom() {
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/dashboard";
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Top Bar */}
<div className="flex justify-between items-center px-8 py-4 border-b border-slate-800">

  <div>
    <h1 className="text-2xl font-bold text-cyan-400">
      IntelliMeet Room
    </h1>

    <p className="text-gray-400 text-sm mt-1">
      Meeting: Project Review
    </p>

    <p className="text-gray-500 text-sm">
      Meeting ID: INT-2026
    </p>
  </div>

  <div className="flex items-center gap-6">

    <div className="text-center">
      <p className="text-xs text-gray-400">
        Duration
      </p>

      <p className="font-bold text-green-400">
        00:15:32
      </p>
    </div>

    <button
      onClick={() => navigate(from)}
      className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg"
    >
      Leave Meeting
    </button>

  </div>

</div>

      <div className="grid md:grid-cols-4 gap-6 p-6">

        {/* Video Area */}
        <div className="md:col-span-3 grid grid-cols-2 gap-4">

          <div className="bg-slate-900 rounded-xl h-60 flex items-center justify-center">
            <h2 className="text-2xl font-bold">Vimal</h2>
          </div>

          <div className="bg-slate-900 rounded-xl h-60 flex items-center justify-center">
            <h2 className="text-2xl font-bold">Sahil</h2>
          </div>

          <div className="bg-slate-900 rounded-xl h-60 flex items-center justify-center">
            <h2 className="text-2xl font-bold">Aadi</h2>
          </div>

          <div className="bg-slate-900 rounded-xl h-60 flex items-center justify-center">
            <h2 className="text-2xl font-bold">Shruti</h2>
          </div>

        </div>

         {/* Participants + Chat */}
        <div className="bg-slate-900 rounded-xl p-4 flex flex-col">

            <h3 className="text-xl font-bold mb-4">
              Participants
            </h3>

  <ul className="space-y-3 mb-6">
    <li>👤 Vimal</li>
    <li>👤 Sahil</li>
    <li>👤 Aadi</li>
    <li>👤 Shruti</li>
  </ul>

  <hr className="border-slate-700 mb-4" />

  <h3 className="text-xl font-bold mb-4">
    Chat
  </h3>

  <div className="bg-slate-800 rounded-lg p-3 h-40 overflow-y-auto mb-4">

    <p className="mb-2">
      <span className="text-cyan-400">Vimal:</span> Hello Team 👋
    </p>

    <p>
      <span className="text-green-400">Sahil:</span> Hi Everyone
    </p>

  </div>

  <input
    type="text"
    placeholder="Type message..."
    className="w-full p-2 rounded-lg bg-slate-800 mb-3"
  />

  <button className="bg-cyan-500 py-2 rounded-lg">
    Send
  </button>

</div>

      </div>

      {/* Bottom Controls */}
<div className="flex justify-center gap-4 pb-8 flex-wrap">

  <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
    🎤 Mic
  </button>

  <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
    🎥 Camera
  </button>

  <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
    🖥 Share Screen
  </button>

  <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
    💬 Chat
  </button>

  <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
    👥 Participants
  </button>

  <button className="bg-red-600 hover:bg-red-500 px-5 py-3 rounded-xl">
    ⏺ Record
  </button>

</div>

    </div>
  );
}

export default MeetingRoom;
import { useNavigate } from "react-router-dom";

function MeetingHistory() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">

        <h1 className="text-4xl font-bold">
          Meeting History
        </h1>

        <button
          onClick={() => navigate("/dashboard")}
          className="bg-cyan-500 px-5 py-2 rounded-lg"
        >
          Back
        </button>

      </div>

      {/* Search + Filter */}
      <div className="flex gap-4 mb-8">

        <input
          type="text"
          placeholder="🔍 Search Meeting..."
          className="bg-slate-800 p-3 rounded-lg w-80"
        />

        <select className="bg-slate-800 p-3 rounded-lg">
          <option>All Status</option>
          <option>Completed</option>
          <option>Upcoming</option>
          <option>Cancelled</option>
        </select>

      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3 className="text-gray-400">Total Meetings</h3>
          <p className="text-4xl font-bold mt-2">52</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3 className="text-gray-400">Completed</h3>
          <p className="text-4xl font-bold text-green-400 mt-2">40</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl">
          <h3 className="text-gray-400">Upcoming</h3>
          <p className="text-4xl font-bold text-yellow-400 mt-2">12</p>
        </div>

      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-800">

            <tr>
              <th className="p-4 text-left">Meeting</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Duration</th>
              <th className="p-4 text-left">Participants</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">AI Summary</th>
              <th className="p-4 text-left">Recording</th>
              <th className="p-4 text-left">Action</th>
            </tr>

          </thead>

          <tbody>

            <tr className="border-t border-slate-700">
              <td className="p-4">Project Review</td>
              <td className="p-4">10 June</td>
              <td className="p-4">45 min</td>
              <td className="p-4">5</td>
              <td className="p-4 text-green-400">Completed</td>

              <td className="p-4">
                <button
                onClick={() => navigate("/ai-summary")}
                className="bg-purple-600 px-3 py-1 rounded-lg">
                  View
                </button>
              </td>

              <td className="p-4">
                <button
                 onClick={() => navigate("/recording")}
                className="bg-red-500 px-3 py-1 rounded-lg">
                  Watch
                </button>
              </td>

              <td className="p-4">
                <button 
                onClick={() => navigate("/meeting-details")}
                className="bg-cyan-500 px-3 py-1 rounded-lg">
                  Details
                </button>
              </td>
            </tr>

            <tr className="border-t border-slate-700">
              <td className="p-4">Team Sync</td>
              <td className="p-4">12 June</td>
              <td className="p-4">30 min</td>
              <td className="p-4">3</td>
              <td className="p-4 text-yellow-400">Upcoming</td>

              <td className="p-4">
                <button className="bg-gray-600 px-3 py-1 rounded-lg">
                  Pending
                </button>
              </td>

              <td className="p-4">
                <button className="bg-gray-600 px-3 py-1 rounded-lg">
                  N/A
                </button>
              </td>

              <td className="p-4">
                <button 
                onClick={() => navigate("/meeting-details")}
                className="bg-cyan-500 px-3 py-1 rounded-lg">
                  Details
                </button>
              </td>
            </tr>

            <tr className="border-t border-slate-700">
              <td className="p-4">Client Call</td>
              <td className="p-4">15 June</td>
              <td className="p-4">60 min</td>
              <td className="p-4">4</td>
              <td className="p-4 text-yellow-400">Upcoming</td>

              <td className="p-4">
                <button className="bg-gray-600 px-3 py-1 rounded-lg">
                  Pending
                </button>
              </td>

              <td className="p-4">
                <button className="bg-gray-600 px-3 py-1 rounded-lg">
                  N/A
                </button>
              </td>
             <td className="p-4">
              <button
            onClick={() => navigate("/meeting-details")}
             className="bg-cyan-500 px-3 py-1 rounded-lg">
                  Details
              </button>
             </td>
            </tr>

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default MeetingHistory;
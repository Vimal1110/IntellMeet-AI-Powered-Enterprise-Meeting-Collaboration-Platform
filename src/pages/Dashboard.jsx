import { useNavigate } from "react-router-dom";
function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-5 border-b border-slate-800">
        <h1 className="text-3xl font-bold text-cyan-400">
          IntelliMeet
        </h1>
        <div className="flex gap-3">
        <button
            onClick={() => navigate("/notifications")}
            className="bg-slate-800 px-4 py-2 rounded-lg">
             Notifications
          </button>

          <button
            onClick={() => navigate("/")}
            className="bg-red-500 px-4 py-2 rounded-lg">
             Logout
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="bg-slate-800 px-4 py-2 rounded-lg">
             Profile
          </button>
        
      </div>
    </div>

      <div className="p-8">

        {/* Heading */}
        <h2 className="text-4xl font-bold mb-8">
          Dashboard
        </h2>
        <div className="mt-8 mb-8">

      </div>

      </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6">

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">Total Meetings</h3>
            <p className="text-4xl font-bold mt-3">12</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">Upcoming</h3>
            <p className="text-4xl font-bold mt-3">3</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">Completed</h3>
            <p className="text-4xl font-bold mt-3">9</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">AI Notes</h3>
            <p className="text-4xl font-bold mt-3">18</p>
          </div>

        </div>

        {/* Quick Actions */}
        <div className="mt-10">
          <h3 className="text-2xl font-bold mb-4">
            Quick Actions
          </h3>

          <div className="flex gap-4">

            <button
              onClick={() =>
               navigate("/create-meeting", {
                state: { from: "/dashboard" },
            })
          }
                className="bg-cyan-500 px-6 py-3 rounded-xl"> 
                Create Meeting
              </button>

            <button
              onClick={() =>
               navigate("/join-meeting", {
                state: { from: "/dashboard" },
             })
          }
             className="border border-cyan-400 px-6 py-3 rounded-xl">
              Join Meeting
        </button>

      
             <button
  onClick={() => navigate("/schedule-meeting")}
  className="bg-green-500 px-6 py-3 rounded-xl"
>
  Schedule Meeting
</button>
           <button
  onClick={() => navigate("/meeting-history")}
  className="border border-cyan-400 px-6 py-3 rounded-xl hover:bg-cyan-400 hover:text-black transition"
>
  History
</button>

          </div>
        </div>

        {/* Recent Meetings */}
        <div className="mt-12">

          <h3 className="text-2xl font-bold mb-4">
            Recent Meetings
          </h3>
        
          <div className="bg-slate-900 rounded-xl overflow-hidden">

            <table className="w-full">

              <thead className="bg-slate-800">
                <tr>
                  <th className="p-4 text-left">Meeting</th>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">Status</th>
                </tr>
              </thead>

              <tbody>

                <tr className="border-t border-slate-800">
                  <td className="p-4">Project Review</td>
                  <td className="p-4">10 June</td>
                  <td className="p-4 text-green-400">Completed</td>
                </tr>

                <tr className="border-t border-slate-800">
                  <td className="p-4">Team Sync</td>
                  <td className="p-4">12 June</td>
                  <td className="p-4 text-yellow-400">Upcoming</td>
                </tr>

                <tr className="border-t border-slate-800">
                  <td className="p-4">Client Call</td>
                  <td className="p-4">15 June</td>
                  <td className="p-4 text-yellow-400">Upcoming</td>
                </tr>

              </tbody>

            </table>

          </div>

        </div>

        {/* AI Notes */}
        <div className="mt-12">

          <h3 className="text-2xl font-bold mb-4">
            AI Generated Summaries
          </h3>

          <div className="grid md:grid-cols-2 gap-6">

            <div className="bg-slate-900 p-5 rounded-xl">
              <h4 className="font-bold mb-2">
                Team Meeting Summary
              </h4>

              <p className="text-gray-400">
                Discussed project milestones and task assignments.
              </p>
            </div>

            <div className="bg-slate-900 p-5 rounded-xl">
              <h4 className="font-bold mb-2">
                Client Discussion
              </h4>

              <p className="text-gray-400">
                Finalized requirements and delivery timeline.
              </p>
            </div>

          </div>

        </div>

      </div>


  );
}

export default Dashboard;
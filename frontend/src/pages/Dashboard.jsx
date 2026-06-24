import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";

function Dashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [stats, setStats] = useState({
    totalMeetings: 0,
    liveMeetings: 0,
    participants: 0,
  });

  const [meetings, setMeetings] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await API.get("/dashboard/stats");
        setStats(statsRes.data);

        const meetingsRes = await API.get("/meetings");
        setMeetings(meetingsRes.data);
      } catch (error) {
        console.log("Dashboard Error:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-slate-950 text-white"
          : "bg-white text-black"
      }`}
    >
      {/* Navbar */}
      <div
        className={`flex flex-col md:flex-row justify-between items-center gap-4 px-4 md:px-8 py-5 border-b ${
          theme === "dark"
            ? "border-slate-800"
            : "border-gray-300"
        }`}
      >
        <h1 className="text-3xl font-bold text-cyan-400">
          IntelliMeet
        </h1>
        <div className="md:hidden flex justify-end w-full">
       <button
          onClick={() => setMenuOpen(!menuOpen)}
           className="text-3xl text-cyan-400">
           ☰
        </button>
        </div>

        <div className="hidden md:flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate("/notifications")}
            className={`px-4 py-2 rounded-lg ${
              theme === "dark"
                ? "bg-slate-800"
                : "bg-gray-200"
            }`}
          >
            {t("notifications")}
          </button>

          <button
            onClick={() => navigate("/analytics")}
            className="bg-purple-500 px-6 py-3 rounded-xl text-white"
          >
            {t("analytics")}
          </button>

          <button
            onClick={() => navigate("/")}
            className="bg-red-500 px-4 py-2 rounded-lg text-white"
          >
            {t("logout")}
          </button>

          <button
            onClick={() => navigate("/profile")}
            className={`px-4 py-2 rounded-lg ${
              theme === "dark"
                ? "bg-slate-800"
                : "bg-gray-200"
            }`}
          >
            {t("profile")}
          </button>
        </div>
      </div>
      {menuOpen && (
  <div className="md:hidden flex flex-col gap-3 mt-4">
    <button
      onClick={() => navigate("/notifications")}
      className="bg-cyan-500 px-4 py-2 rounded-lg text-white"
    >
      Notifications
    </button>

    <button
      onClick={() => navigate("/analytics")}
      className="bg-purple-500 px-4 py-2 rounded-lg text-white"
    >
      Analytics
    </button>

    <button
      onClick={() => navigate("/profile")}
      className="bg-slate-700 px-4 py-2 rounded-lg text-white"
    >
      Profile
    </button>

    <button
      onClick={() => navigate("/")}
      className="bg-red-500 px-4 py-2 rounded-lg text-white"
    >
      Logout
    </button>
  </div>
)}

      <div className="p-8 md:p-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-8">
          {t("dashboard")}
        </h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1md:grid-cols-4 gap-4 md:gap-6">
          <div
            className={`p-6 rounded-xl ${
              theme === "dark"
                ? "bg-slate-900 text-white"
                : "bg-gray-100 text-black"
            }`}
          >
            <h3 className="text-gray-400">
              {t("totalMeetings")}
            </h3>
            <p className="text-4xl font-bold mt-3">
              {stats.totalMeetings}
            </p>
          </div>

          <div
            className={`p-6 rounded-xl ${
              theme === "dark"
                ? "bg-slate-900 text-white"
                : "bg-gray-100 text-black"
            }`}
          >
            <h3 className="text-gray-400">
              {t("liveMeetings")}
            </h3>
            <p className="text-4xl font-bold mt-3">
              {stats.liveMeetings}
            </p>
          </div>

          <div
            className={`p-6 rounded-xl ${
              theme === "dark"
                ? "bg-slate-900 text-white"
                : "bg-gray-100 text-black"
            }`}
          >
            <h3 className="text-gray-400">
              {t("participants")}
            </h3>
            <p className="text-4xl font-bold mt-3">
              {stats.participants}
            </p>
          </div>

          <div
            className={`p-6 rounded-xl ${
              theme === "dark"
                ? "bg-slate-900 text-white"
                : "bg-gray-100 text-black"
            }`}
          >
            <h3 className="text-gray-400">
              {t("aiNotes")}
            </h3>
            <p className="text-4xl font-bold mt-3">
              18
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-10">
          <h3 className="text-2xl font-bold mb-4">
            {t("quickActions")}
          </h3>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={() =>
                navigate("/create-meeting", {
                  state: { from: "/dashboard" },
                })
              }
              className="bg-cyan-500 px-6 py-3 rounded-xl text-white"
            >
              {t("createMeeting")}
            </button>

            <button
              onClick={() =>
                navigate("/join-meeting", {
                  state: { from: "/dashboard" },
                })
              }
              className="border border-cyan-400 px-6 py-3 rounded-xl"
            >
              {t("joinMeeting")}
            </button>

            <button
              onClick={() => navigate("/schedule-meeting")}
              className="bg-green-500 px-6 py-3 rounded-xl text-white"
            >
              {t("scheduleMeeting")}
            </button>

            <button
              onClick={() => navigate("/meeting-history")}
              className="border border-cyan-400 px-6 py-3 rounded-xl hover:bg-cyan-400 hover:text-black transition"
            >
              {t("history")}
            </button>
          </div>
        </div>

        {/* Recent Meetings */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-4">
            {t("recentMeetings")}
          </h3>

          <div
            className={`rounded-xl overflow-x-auto ${
              theme === "dark"
                ? "bg-slate-900 text-white"
                : "bg-gray-100 text-black"
            }`}
          >
            <table className="w-full">
              <thead
                className={
                  theme === "dark"
                    ? "bg-slate-800"
                    : "bg-gray-200"
                }
              >
                <tr>
                  <th className="p-4 text-left">
                    {t("meeting")}
                  </th>
                  <th className="p-4 text-left">
                    {t("date")}
                  </th>
                  <th className="p-4 text-left">
                    {t("status")}
                  </th>
                </tr>
              </thead>

              <tbody>

                { 
                meetings
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 8).map((meeting) => (
                  <tr
                    key={meeting._id}
                    className={`border-t ${
                      theme === "dark"
                        ? "border-slate-800"
                        : "border-gray-300"
                    }`}
                  >
                    <td className="p-4">
                      {meeting.title}
                    </td>

                    <td className="p-4">
                      {new Date(
                        meeting.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-yellow-500">
                      {meeting.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Notes */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-4">
            {t("aiGeneratedSummaries")}
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div
              className={`p-5 rounded-xl ${
                theme === "dark"
                  ? "bg-slate-900 text-white"
                  : "bg-gray-100 text-black"
              }`}
            >
              <h4 className="font-bold mb-2">
                {t("teamMeetingSummary")}
              </h4>

              <p
                className={
                  theme === "dark"
                    ? "text-gray-400"
                    : "text-gray-600"
                }
              >
                {t("teamMeetingText")}
              </p>
            </div>

            <div
              className={`p-5 rounded-xl ${
                theme === "dark"
                  ? "bg-slate-900 text-white"
                  : "bg-gray-100 text-black"
              }`}
            >
              <h4 className="font-bold mb-2">
                {t("clientDiscussion")}
              </h4>

              <p
                className={
                  theme === "dark"
                    ? "text-gray-400"
                    : "text-gray-600"
                }
              >
                {t("clientDiscussionText")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
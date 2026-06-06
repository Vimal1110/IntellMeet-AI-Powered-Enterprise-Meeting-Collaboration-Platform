import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message:
        "📅 Meeting 'Project Review' scheduled for tomorrow at 10:00 AM",
      color: "bg-blue-500",
    },
    {
      id: 2,
      message: "👥 Sahil joined your meeting room",
      color: "bg-green-500",
    },
    {
      id: 3,
      message: "🤖 AI Summary generated successfully",
      color: "bg-orange-500",
    },
  ]);

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id) => {
    setNotifications(
      notifications.filter((item) => item.id !== id)
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">

        <h1 className="text-5xl font-bold">
          Notifications
        </h1>

        <div className="flex gap-3">

          <button
            onClick={() => navigate("/dashboard")}
            className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg font-semibold"
          >
            ← Dashboard
          </button>

          <button
            onClick={clearAllNotifications}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
          >
            Clear All
          </button>

        </div>
      </div>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        notifications.map((item) => (
          <div
            key={item.id}
            className={`${item.color} p-4 rounded-lg mb-4 flex justify-between items-center shadow-lg`}
          >

            <span>{item.message}</span>

            <div className="flex items-center gap-4">

              <span className="text-sm">
                Just Now
              </span>

              <button
                onClick={() => markAsRead(item.id)}
                className="bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-lg text-sm"
              >
                Mark Read
              </button>

            </div>

          </div>
        ))
      ) : (
        <div className="text-center mt-32">
          <h2 className="text-3xl font-bold text-gray-400">
            No Notifications
          </h2>
          <p className="text-gray-500 mt-3">
            You're all caught up 🎉
          </p>
        </div>
      )}

    </div>
  );
}

export default Notifications;
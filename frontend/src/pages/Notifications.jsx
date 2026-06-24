import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const typeStyles = {
  scheduled: "bg-blue-500",
  started: "bg-red-500",
  meetingEnded: "bg-purple-500",
  recorded: "bg-rose-500",
  aiSummary: "bg-orange-500",
};

function timeAgo(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just Now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Star rating selected per notification id. Frontend-only, as
  // decided — nothing here is sent to the backend. Kept separate from
  // the notifications array so "Mark Read" / "Clear All" don't need to
  // carry rating state around with them.
  const [ratings, setRatings] = useState({});
  const [hoverRatings, setHoverRatings] = useState({});

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await API.get("/notifications");
        setNotifications(res.data);
      } catch (err) {
        console.log(err);
        setError(err.response?.data?.message || "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const setRating = (id, value) => {
    setRatings((prev) => ({ ...prev, [id]: value }));
  };

  const setHoverRating = (id, value) => {
    setHoverRatings((prev) => ({ ...prev, [id]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading notifications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg font-semibold"
        >
          ← Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">Notifications</h1>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg font-semibold"
          >
            <span className="md:hidden">←</span>
            <span className="hidden md:inline">← Dashboard</span>
          </button>

          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notifications List — every entry below is derived from a real
          Meeting document (scheduled/started/ended/recorded/summarized),
          not hardcoded sample data. */}
      {notifications.length > 0 ? (
        notifications.map((item) => {
          const currentRating = ratings[item.id] || 0;
          const hoverRating = hoverRatings[item.id] || 0;
          const displayRating = hoverRating || currentRating;
          const colorClass = typeStyles[item.type] || "bg-slate-700";

          return (
            <div
              key={item.id}
              className={`${colorClass} p-4 rounded-lg mb-4 shadow-lg`}
            >
              <div className="flex justify-between items-center">
                <span>{item.message}</span>

                <div className="flex items-center gap-4">
                  <span className="text-sm">{timeAgo(item.timestamp)}</span>

                  <button
                    onClick={() => markAsRead(item.id)}
                    className="bg-slate-900 hover:bg-slate-800 px-3 py-1 rounded-lg text-sm"
                  >
                    Mark Read
                  </button>
                </div>
              </div>

              {/* Star rating — only on meeting-ended notifications.
                  Local UI state only; nothing persisted. */}
              {item.type === "meetingEnded" && (
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-3">
                  <span className="text-sm font-medium">
                    Rate this meeting:
                  </span>

                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(item.id, star)}
                        onMouseEnter={() => setHoverRating(item.id, star)}
                        onMouseLeave={() => setHoverRating(item.id, 0)}
                        className="text-2xl leading-none transition-transform hover:scale-110"
                        aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                      >
                        {star <= displayRating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>

                  {currentRating > 0 && (
                    <span className="text-sm text-white/80">
                      You rated this {currentRating}/5
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center mt-32">
          <h2 className="text-3xl font-bold text-gray-400">No Notifications</h2>
          <p className="text-gray-500 mt-3">You're all caught up 🎉</p>
        </div>
      )}
    </div>
  );
}

export default Notifications;

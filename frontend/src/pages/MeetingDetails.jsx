import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import API, { generateAISummary } from "../services/api";

function MeetingDetails() {
  const navigate = useNavigate();
  const location = useLocation();

  const passedMeeting = location.state?.meeting;

  const [meeting, setMeeting] = useState(passedMeeting || null);
  const [loading, setLoading] = useState(!passedMeeting);
  const [error, setError] = useState(null);

  // AI states
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAIError] = useState(null);

  useEffect(() => {
    if (passedMeeting) return;

    const meetingId = location.state?.meetingId;

    if (!meetingId) {
      setError("No meeting selected.");
      setLoading(false);
      return;
    }

    const fetchMeeting = async () => {
      try {
        const res = await API.get(`/meetings/${meetingId}`);
        setMeeting(res.data);
      } catch (err) {
        console.error("FETCH MEETING ERROR:", err);

        setError(
          err.response?.data?.message || "Failed to load meeting",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMeeting();
  }, [passedMeeting, location.state]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";

    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "—";

    return `${minutes} Minute${minutes === 1 ? "" : "s"}`;
  };

  // ============================================================
  // GENERATE AI SUMMARY
  // ============================================================

  const handleGenerateAISummary = async () => {
    if (!meeting?._id) {
      setAIError("Meeting ID is missing.");
      return;
    }

    try {
      setGeneratingAI(true);
      setAIError(null);

      const data = await generateAISummary(meeting._id);

      if (!data?.summary) {
        throw new Error("AI did not return a summary.");
      }

      // Update local meeting state immediately
      setMeeting((prev) => ({
        ...prev,
        aiSummary: data.summary,
      }));
    } catch (err) {
      console.error("AI SUMMARY ERROR:", err);

      setAIError(
        err.response?.data?.message ||
          err.message ||
          "Failed to generate AI summary.",
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>

          <p className="text-slate-300">
            Loading meeting...
          </p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-lg text-red-400">
          {error || "Meeting not found"}
        </p>

        <button
          onClick={() => navigate("/meeting-history")}
          className="bg-cyan-500 hover:bg-cyan-600 px-5 py-2 rounded-lg"
        >
          ← Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          Meeting Details
        </h1>

        <button
          onClick={() => navigate("/meeting-history")}
          className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg"
        >
          Back
        </button>
      </div>

      {/* ======================================================
          MEETING INFORMATION
      ====================================================== */}

      <div className="bg-slate-900 p-8 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">
            {meeting.title}
          </h2>

          <span className="text-slate-400 text-sm">
            Code: {meeting.meetingCode}
          </span>
        </div>

        {meeting.description && (
          <p className="text-slate-400 mb-6">
            {meeting.description}
          </p>
        )}

        {/* ==================================================
            MEETING STATS
        ================================================== */}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-400">
              Date
            </p>

            <p>
              {formatDate(meeting.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-gray-400">
              Duration
            </p>

            <p>
              {formatDuration(meeting.duration)}
            </p>
          </div>

          <div>
            <p className="text-gray-400">
              Participants
            </p>

            <p>
              {meeting.participants?.length || 0} Members
            </p>
          </div>

          <div>
            <p className="text-gray-400">
              Status
            </p>

            <p
              className={
                meeting.status === "Completed"
                  ? "text-green-400"
                  : meeting.status === "Live"
                    ? "text-red-400"
                    : "text-yellow-400"
              }
            >
              {meeting.status}
            </p>
          </div>
        </div>

        {/* ==================================================
            PARTICIPANTS
        ================================================== */}

        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">
            Participants List
          </h3>

          {meeting.participants?.length > 0 ? (
            <ul className="space-y-2">
              {meeting.participants.map((participant) => (
                <li
                  key={participant._id}
                  className="text-slate-300"
                >
                  👤{" "}
                  {participant.name ||
                    participant.email ||
                    "Unknown"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">
              No participants recorded.
            </p>
          )}
        </div>

        {/* ==================================================
            AI SUMMARY SECTION
        ================================================== */}

        <div className="mt-10 border border-purple-500/30 bg-purple-950/20 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                🤖 AI Meeting Summary
              </h3>

              <p className="text-slate-400 mt-1">
                Generate an AI-powered summary of this meeting.
              </p>
            </div>

            <button
              onClick={handleGenerateAISummary}
              disabled={generatingAI}
              className={`px-5 py-3 rounded-lg font-semibold transition ${
                generatingAI
                  ? "bg-purple-900 text-purple-300 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {generatingAI
                ? "🤖 Generating..."
                : meeting.aiSummary
                  ? "🔄 Regenerate Summary"
                  : "✨ Generate AI Summary"}
            </button>
          </div>

          {/* AI ERROR */}

          {aiError && (
            <div className="mt-5 bg-red-950/40 border border-red-500/40 rounded-lg p-4">
              <p className="text-red-400">
                ❌ {aiError}
              </p>
            </div>
          )}

          {/* AI SUMMARY */}

          {meeting.aiSummary ? (
            <div className="mt-6 bg-slate-900 rounded-lg p-6 border border-slate-700">
              <h4 className="text-lg font-semibold text-purple-300 mb-4">
                Generated Summary
              </h4>

              <div className="text-slate-300 whitespace-pre-wrap leading-7">
                {meeting.aiSummary}
              </div>
            </div>
          ) : (
            <div className="mt-6 bg-slate-900/60 rounded-lg p-6 text-center">
              <p className="text-slate-500">
                No AI summary generated yet.
              </p>

              <p className="text-slate-600 text-sm mt-2">
                Click "Generate AI Summary" to create one.
              </p>
            </div>
          )}
        </div>

        {/* ==================================================
            RECORDING + OLD AI SUMMARY BUTTONS
        ================================================== */}

        <div className="flex flex-wrap gap-4 mt-8">
          <button
            onClick={() =>
              meeting.recordingUrl &&
              navigate("/recording", {
                state: { meeting },
              })
            }
            disabled={!meeting.recordingUrl}
            className={`px-5 py-3 rounded-lg ${
              meeting.recordingUrl
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-600 opacity-60 cursor-not-allowed"
            }`}
          >
            🎥 Recording{" "}
            {!meeting.recordingUrl && "(N/A)"}
          </button>

          {meeting.aiSummary && (
            <button
              onClick={() =>
                navigate("/ai-summary", {
                  state: { meeting },
                })
              }
              className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-lg"
            >
              📄 Open Full AI Summary
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MeetingDetails;
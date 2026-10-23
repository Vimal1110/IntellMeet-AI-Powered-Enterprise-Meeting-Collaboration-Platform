import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    meetingCode: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["Scheduled", "Live", "Completed"],
      default: "Scheduled",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    scheduledAt: {
      type: Date,
      default: Date.now,
    },

    startedAt: {
      type: Date,
    },

    endedAt: {
      type: Date,
    },

    duration: {
      type: Number,
      default: 0,
    },
    recordingUrl: {
      type: String,
      default: "",
    },

    isRecorded: {
      type: Boolean,
      default: false,
    },

    // Complete speech-to-text transcript generated from the meeting audio.
    transcript: {
      type: String,
      default: "",
    },

    transcriptChunks: [
      {
        index: { type: Number, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    transcriptStatus: {
      type: String,
      enum: ["idle", "processing", "completed", "failed"],
      default: "idle",
    },

    aiAnalysis: {
      overview: { type: String, default: "" },
      keyPoints: { type: [String], default: [] },
      decisions: { type: [String], default: [] },
      actionItems: {
        type: [
          {
            task: { type: String, default: "" },
            assignee: { type: String, default: "Unassigned" },
            deadline: { type: String, default: "Not specified" },
          },
        ],
        default: [],
      },
      keywords: { type: [String], default: [] },
    },

    aiStatus: {
      type: String,
      enum: ["idle", "processing", "completed", "failed"],
      default: "idle",
    },

    aiGeneratedAt: {
      type: Date,
    },

    aiSummary: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Meeting", meetingSchema);

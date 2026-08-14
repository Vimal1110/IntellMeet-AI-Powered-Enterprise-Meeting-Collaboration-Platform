import OpenAI from "openai";
import Meeting from "../models/Meeting.js";

export const generateMeetingSummary = async (req, res) => {
  try {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
});
    const { id } = req.params;

    const meeting = await Meeting.findById(id)
      .populate("createdBy", "name email")
      .populate("participants", "name email");

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }

    // Check whether current user belongs to this meeting
    const userId = req.user._id.toString();

    const isCreator =
      meeting.createdBy?._id?.toString() === userId;

    const isParticipant = meeting.participants.some(
      (participant) => participant._id.toString() === userId,
    );

    if (!isCreator && !isParticipant) {
      return res.status(403).json({
        message: "You are not authorized to generate this summary",
      });
    }

    const participantNames = meeting.participants
      .map((participant) => participant.name)
      .filter(Boolean)
      .join(", ");

    const meetingInformation = `
Meeting Title: ${meeting.title}
Description: ${meeting.description || "No description"}
Meeting Code: ${meeting.meetingCode}
Status: ${meeting.status}
Created By: ${meeting.createdBy?.name || "Unknown"}
Participants: ${participantNames || "No participants"}
Scheduled At: ${meeting.scheduledAt || "Not specified"}
Started At: ${meeting.startedAt || "Not specified"}
Ended At: ${meeting.endedAt || "Not specified"}
Duration: ${meeting.duration || 0} minutes
`;

    const response = await openai.responses.create({
      model: "openrouter/free",
      instructions:
        "You are an AI meeting assistant. Generate a professional and concise meeting summary. Clearly separate overview, key points, decisions, action items, and participants. Do not invent information that is not present in the provided meeting data.",
      input: `Generate a meeting summary from the following information:\n\n${meetingInformation}`,
    });

    const summary = response.output_text?.trim();

    if (!summary) {
      return res.status(500).json({
        message: "AI did not return a summary",
      });
    }

    meeting.aiSummary = summary;
    await meeting.save();

    res.status(200).json({
      message: "AI summary generated successfully",
      summary,
    });
  } catch (error) {
    console.error("AI SUMMARY ERROR:", error);

    res.status(500).json({
      message: error.message || "Failed to generate AI summary",
    });
  }
};
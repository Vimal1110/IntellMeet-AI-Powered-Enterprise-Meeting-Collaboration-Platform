import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import Meeting from "../models/Meeting.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const STT_MODEL = process.env.OPENROUTER_STT_MODEL || "openai/whisper-large-v3";
const SUMMARY_MODEL = process.env.OPENROUTER_SUMMARY_MODEL || "openrouter/free";

const getApiKey = () =>
  process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";

const createOpenAIClient = () => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error(
      "OpenRouter API key is missing. Set OPENROUTER_API_KEY in backend/.env."
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });
};

const getMeetingForUser = async (id, userId) => {
  const meeting = await Meeting.findById(id)
    .populate("createdBy", "name email")
    .populate("participants", "name email");

  if (!meeting) return { meeting: null, authorized: false };

  const uid = userId.toString();
  const isCreator = meeting.createdBy?._id?.toString() === uid;
  const isParticipant = meeting.participants.some(
    (participant) => participant._id?.toString() === uid
  );

  return {
    meeting,
    authorized: isCreator || isParticipant,
  };
};

const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const bufferToBase64 = (buffer) => buffer.toString("base64");

const transcribeBuffer = async (buffer, format = "webm", language) => {
  if (!buffer?.length) {
    throw new Error("Audio chunk is empty.");
  }

  if (!getApiKey()) {
    throw new Error(
      "OpenRouter API key is missing. Set OPENROUTER_API_KEY in backend/.env."
    );
  }

  // OpenRouter's STT endpoint accepts base64-encoded audio and supports
  // WebM, which matches the browser MediaRecorder output used by IntelliMeet.
  const response = await fetch(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: STT_MODEL,
      input_audio: {
        data: bufferToBase64(buffer),
        format,
      },
      ...(language ? { language } : {}),
      temperature: 0,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Speech-to-text request failed (${response.status}).`;
    throw new Error(message);
  }

  const text = normalizeText(payload?.text);

  if (!text) {
    throw new Error("Speech-to-text returned an empty transcript.");
  }

  return {
    text,
    usage: payload?.usage || null,
  };
};

const transcribeStoredRecording = async (meeting) => {
  if (!meeting.recordingUrl) return "";

  const filePath = path.join(
    process.cwd(),
    "uploads",
    meeting.recordingUrl,
  );

  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    throw new Error("The meeting recording file is not available on the server.");
  }

  if (buffer.length > 25 * 1024 * 1024) {
    throw new Error(
      "This recording is too large for one speech-to-text request. Please use the meeting recording flow again so IntelliMeet can transcribe it in smaller audio chunks."
    );
  }

  const result = await transcribeBuffer(buffer, "webm");

  meeting.transcriptChunks = [
    { index: 0, text: result.text },
  ];
  meeting.transcript = result.text;
  return result.text;
};

const buildAnalysis = async (meeting, transcript) => {
  const client = createOpenAIClient();

  const participantNames = meeting.participants
    .map((participant) => participant.name || participant.email)
    .filter(Boolean)
    .join(", ");

  const prompt = `
You are IntelliMeet's professional meeting-analysis assistant.

Analyze ONLY the transcript below. Do not invent facts, names, decisions, deadlines, or action items that are not supported by the transcript.

Return ONLY valid JSON with exactly these keys:
{
  "overview": "short factual overview",
  "keyPoints": ["important point 1"],
  "decisions": ["decision 1"],
  "actionItems": [
    {"task": "task description", "assignee": "person or Unassigned", "deadline": "deadline or Not specified"}
  ],
  "keywords": ["keyword1", "keyword2"]
}

Rules:
- The transcript is the source of truth.
- Extract the most important discussion points, not generic meeting metadata.
- Only create an action item when the transcript actually assigns work or a next step.
- Only create a decision when the transcript contains a decision/agreement.
- If a category is not supported by the transcript, return an empty array.
- Keep the overview concise and factual.
- Do not mention that you are an AI.

Meeting title: ${meeting.title}
Participants recorded by the application: ${participantNames || "Unknown"}

TRANSCRIPT:
${transcript}
`;

  const response = await client.chat.completions.create({
    model: SUMMARY_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a precise enterprise meeting assistant. Output only valid JSON when requested.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = response.choices?.[0]?.message?.content?.trim();

  if (!raw) {
    throw new Error("AI analysis returned an empty response.");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some free models can ignore the JSON response-format instruction.
    // Keep the raw answer rather than crashing the meeting workflow.
    parsed = {
      overview: raw,
      keyPoints: [],
      decisions: [],
      actionItems: [],
      keywords: [],
    };
  }

  const analysis = {
    overview: normalizeText(parsed.overview),
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.map(normalizeText).filter(Boolean)
      : [],
    decisions: Array.isArray(parsed.decisions)
      ? parsed.decisions.map(normalizeText).filter(Boolean)
      : [],
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .map((item) => ({
            task: normalizeText(item?.task),
            assignee: normalizeText(item?.assignee) || "Unassigned",
            deadline: normalizeText(item?.deadline) || "Not specified",
          }))
          .filter((item) => item.task)
      : [],
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map(normalizeText).filter(Boolean).slice(0, 20)
      : [],
  };

  return analysis;
};

const analysisToText = (analysis) => {
  const lines = [
    "OVERVIEW",
    analysis.overview || "No overview was identified from the transcript.",
    "",
    "KEY POINTS",
    ...(analysis.keyPoints.length
      ? analysis.keyPoints.map((item) => `• ${item}`)
      : ["• No key points identified from the transcript."]),
    "",
    "DECISIONS",
    ...(analysis.decisions.length
      ? analysis.decisions.map((item) => `• ${item}`)
      : ["• No decisions identified from the transcript."]),
    "",
    "ACTION ITEMS",
    ...(analysis.actionItems.length
      ? analysis.actionItems.map(
          (item) =>
            `• ${item.task} | Assignee: ${item.assignee} | Deadline: ${item.deadline}`
        )
      : ["• No action items identified from the transcript."]),
    "",
    "KEYWORDS",
    analysis.keywords.length ? analysis.keywords.join(", ") : "No keywords identified.",
  ];

  return lines.join("\n");
};

export const transcribeMeetingChunk = async (req, res) => {
  try {
    const { id } = req.params;
    const { meeting, authorized } = await getMeetingForUser(id, req.user._id);

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (!authorized) return res.status(403).json({ message: "You are not authorized to process this meeting" });

    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: "No audio chunk received" });
    }

    const chunkIndex = Number(req.body?.chunkIndex);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return res.status(400).json({ message: "A valid audio chunk index is required" });
    }

    const existing = meeting.transcriptChunks.find(
      (chunk) => chunk.index === chunkIndex
    );

    if (existing) {
      return res.json({
        message: "Transcript chunk already exists",
        chunkIndex,
        text: existing.text,
      });
    }

    const language = normalizeText(req.body?.language) || undefined;
    const result = await transcribeBuffer(req.file.buffer, "webm", language);

    meeting.transcriptChunks.push({
      index: chunkIndex,
      text: result.text,
    });
    meeting.transcriptChunks.sort((a, b) => a.index - b.index);
    meeting.transcriptStatus = "processing";
    meeting.transcript = meeting.transcriptChunks
      .sort((a, b) => a.index - b.index)
      .map((chunk) => chunk.text)
      .join(" ")
      .trim();

    await meeting.save();

    res.status(200).json({
      message: "Audio transcribed successfully",
      chunkIndex,
      text: result.text,
      transcript: meeting.transcript,
      usage: result.usage,
    });
  } catch (error) {
    console.error("TRANSCRIPTION CHUNK ERROR:", error);
    res.status(500).json({
      message: error.message || "Failed to transcribe audio",
    });
  }
};

export const finalizeMeetingAI = async (req, res) => {
  try {
    const { id } = req.params;
    const { meeting, authorized } = await getMeetingForUser(id, req.user._id);

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (!authorized) return res.status(403).json({ message: "You are not authorized to analyze this meeting" });

    let transcript = meeting.transcriptChunks
      .sort((a, b) => a.index - b.index)
      .map((chunk) => chunk.text)
      .join(" ")
      .trim();

    // Backward-compatible fallback for recordings created before the new
    // chunked STT recorder was installed. This keeps the existing Recording
    // feature useful without changing its upload format.
    if (!transcript && meeting.recordingUrl) {
      transcript = await transcribeStoredRecording(meeting);
      meeting.transcriptStatus = "completed";
      await meeting.save();
    }

    if (!transcript) {
      return res.status(400).json({
        message:
          "No transcript is available yet. Record a meeting with microphone audio enabled and try again.",
      });
    }

    meeting.transcript = transcript;
    meeting.transcriptStatus = "completed";
    meeting.aiStatus = "processing";
    await meeting.save();

    const analysis = await buildAnalysis(meeting, transcript);
    const summary = analysisToText(analysis);

    meeting.aiAnalysis = analysis;
    meeting.aiSummary = summary;
    meeting.aiStatus = "completed";
    meeting.aiGeneratedAt = new Date();
    await meeting.save();

    res.status(200).json({
      message: "Transcript and AI analysis generated successfully",
      transcript,
      analysis,
      summary,
    });
  } catch (error) {
    console.error("FINAL AI ANALYSIS ERROR:", error);

    try {
      const meeting = await Meeting.findById(req.params.id);
      if (meeting) {
        meeting.aiStatus = "failed";
        await meeting.save();
      }
    } catch (saveError) {
      console.error("Could not save AI failure state:", saveError);
    }

    res.status(500).json({
      message: error.message || "Failed to generate AI analysis",
    });
  }
};

export const generateMeetingSummary = async (req, res) => {
  // Keep the original endpoint working. It now uses the actual transcript
  // instead of meeting metadata, which fixes the old metadata-only summary.
  return finalizeMeetingAI(req, res);
};

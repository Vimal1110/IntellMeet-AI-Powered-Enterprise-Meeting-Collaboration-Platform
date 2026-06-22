import Meeting from "../models/Meeting.js";

const generateMeetingCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createMeeting = async (req, res) => {
  try {
    const { title, description } = req.body;

    const meeting = await Meeting.create({
      title,
      description,
      meetingCode: generateMeetingCode(),
      createdBy: req.user._id,
      participants: [req.user._id],
    });

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(meetings);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const joinMeeting = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        message: "Meeting code is required",
      });
    }

    // FIX: normalize the same way the code is generated (trim whitespace,
    // uppercase) before querying. Without this, a typed code with a
    // trailing space, or typed in lowercase, will silently fail to match
    // an otherwise-correct meetingCode in the DB — findOne is a strict
    // equality match with no trimming/case-insensitivity by default.
    const normalizedCode = code.trim().toUpperCase();

    const meeting = await Meeting.findOne({
      meetingCode: normalizedCode,
    });

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }

    const alreadyJoined = meeting.participants.some(
      (participant) => participant.toString() === req.user._id.toString(),
    );

    if (!alreadyJoined) {
      meeting.participants.push(req.user._id);
      await meeting.save();
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("participants", "name email");

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

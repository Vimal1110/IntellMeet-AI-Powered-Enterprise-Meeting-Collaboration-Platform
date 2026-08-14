import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import API from "../services/api";
import socket from "../socket";

// STUN is enough for many same-network/simple-NAT tests.
// For reliable production calls across different networks, add a TURN server
// through Vite environment variables:
// VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(import.meta.env.VITE_TURN_URL
    ? [
        {
          urls: import.meta.env.VITE_TURN_URL,
          username: import.meta.env.VITE_TURN_USERNAME,
          credential: import.meta.env.VITE_TURN_CREDENTIAL,
        },
      ]
    : []),
];

// Keep the local MediaStream outside React's component lifecycle.
// Vite Fast Refresh recreates React effects on Ctrl+S; without this shared
// reference, the cleanup would stop the camera and then getUserMedia() would
// start it again, causing the camera OFF -> ON notification.
const LOCAL_STREAM_KEY = "__intelliMeetLocalStream";

const getSharedLocalStream = () => {
  if (typeof window === "undefined" || typeof MediaStream === "undefined") {
    return null;
  }

  const stream = window[LOCAL_STREAM_KEY];

  if (!(stream instanceof MediaStream)) return null;

  const hasLiveTrack = stream.getTracks().some(
    (track) => track.readyState === "live"
  );

  if (!stream.active || !hasLiveTrack) {
    delete window[LOCAL_STREAM_KEY];
    return null;
  }

  return stream;
};

const saveSharedLocalStream = (stream) => {
  if (typeof window !== "undefined") {
    window[LOCAL_STREAM_KEY] = stream;
  }
};

const stopSharedLocalStream = () => {
  if (typeof window === "undefined") return;

  const stream = window[LOCAL_STREAM_KEY];

  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  delete window[LOCAL_STREAM_KEY];
};


function MeetingRoom() {
  const navigate = useNavigate();
  const location = useLocation();

  const [meeting, setMeeting] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [roomFullError, setRoomFullError] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState({});
  const [localVideoStream, setLocalVideoStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [meetingError, setMeetingError] = useState(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState(null);

  const localVideoRef = useRef(null);
  const localStream = useRef(null);
  const screenStream = useRef(null);
  const mediaRecorder = useRef(null);
  const recordingChunks = useRef([]);
  const recordingSource = useRef(null);

  // One RTCPeerConnection per remote participant.
  const peerConnections = useRef(new Map());

  // ICE candidates received before remoteDescription is ready.
  const pendingCandidates = useRef(new Map());

  // Remote <video> elements keyed by socket id.
  const remoteVideoRefs = useRef(new Map());

  const hasJoinedRoom = useRef(false);
  const joiningRoom = useRef(false);

  const meetingId =
    location.state?.meetingId || location.state?.meeting?._id;
  const from = location.state?.from || "/dashboard";

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  // ------------------------------------------------------------
  // Local camera + microphone
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access is not supported by this browser/context."
          );
        }

        // Reuse the current stream when Vite Fast Refresh re-runs this effect.
        // This is the important fix for Ctrl+S: we do NOT stop the physical
        // camera just because React refreshed this component.
        let stream = getSharedLocalStream();

        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
            },
            audio: true,
          });

          saveSharedLocalStream(stream);
        }

        if (cancelled) {
          // Do not stop this stream. A Fast Refresh may immediately reuse it.
          return;
        }

        localStream.current = stream;
        setLocalVideoStream(stream);
        setMediaReady(true);
        setCameraError(null);

        const video = localVideoRef.current;

        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;

          try {
            await video.play();
          } catch (err) {
            // The attachment effect below retries after the video element mounts.
            console.debug("Local video play will retry:", err?.message);
          }
        }
      } catch (err) {
        console.error("getUserMedia error:", err);
        setMediaReady(false);

        if (
          err?.name === "NotReadableError" ||
          err?.name === "TrackStartError"
        ) {
          setCameraError(
            "Camera is already in use by another tab or app. Close other apps/tabs using the camera and reload."
          );
        } else if (err?.name === "NotAllowedError") {
          setCameraError(
            "Camera/microphone permission was denied. Allow camera and microphone access in the browser and reload."
          );
        } else if (err?.name === "NotFoundError") {
          setCameraError("No camera or microphone was found.");
        } else {
          setCameraError(
            "Could not access camera/microphone: " +
              (err?.message || "Unknown error")
          );
        }

        // Do not permanently block the meeting if media is unavailable.
        setMediaReady(true);
      }
    };

    startCamera();

    return () => {
      cancelled = true;

      // IMPORTANT:
      // Vite Fast Refresh executes effect cleanup when MeetingRoom.jsx is
      // saved. Stopping tracks here causes the camera OFF -> ON notification.
      // We intentionally keep the stream alive. It is stopped explicitly by
      // handleLeave() or when the browser page is closed.
      localStream.current = null;

      // Do not close WebRTC peers here either. Fast Refresh should not tear
      // down the current meeting connection.
    };
  }, []);

  // Attach the current MediaStream whenever React has mounted/updated the
  // <video> element. This replaces the noisy NULL checks from the old code.
  useLayoutEffect(() => {
    const video = localVideoRef.current;
    const stream = localVideoStream;

    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    video.play().catch((err) => {
      console.debug("Local video play retry:", err?.message);
    });
  }, [localVideoStream, meeting]);

  // Stop the shared stream when the browser page itself is closed/refreshed.
  useEffect(() => {
    const stopOnPageClose = () => {
      screenStream.current?.getTracks().forEach((track) => track.stop());
      screenStream.current = null;
      stopSharedLocalStream();
    };

    window.addEventListener("beforeunload", stopOnPageClose);
    window.addEventListener("pagehide", stopOnPageClose);

    return () => {
      window.removeEventListener("beforeunload", stopOnPageClose);
      window.removeEventListener("pagehide", stopOnPageClose);
    };
  }, []);

  // ------------------------------------------------------------
  // Peer connection helper
  // ------------------------------------------------------------
  const createPeerConnection = useCallback(
    (targetSocketId) => {
      const oldPc = peerConnections.current.get(targetSocketId);

      if (oldPc) {
        oldPc.ontrack = null;
        oldPc.onicecandidate = null;
        oldPc.close();
        peerConnections.current.delete(targetSocketId);
      }

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
      });

      // Add the current local tracks immediately. If screen sharing is
      // active, send the screen video track instead of the camera video track.
      // Audio always continues to come from the camera/microphone stream.
      if (localStream.current) {
        localStream.current.getAudioTracks().forEach((track) => {
          const alreadyAdded = pc
            .getSenders()
            .some((sender) => sender.track === track);

          if (!alreadyAdded) {
            pc.addTrack(track, localStream.current);
          }
        });

        const videoTrack =
          screenStream.current?.getVideoTracks()?.[0] ||
          localStream.current.getVideoTracks()?.[0];

        if (videoTrack) {
          const alreadyAdded = pc
            .getSenders()
            .some((sender) => sender.track === videoTrack);

          if (!alreadyAdded) {
            const videoSource = screenStream.current || localStream.current;
            pc.addTrack(videoTrack, videoSource);
          }
        }
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        socket.emit("iceCandidate", {
          roomId: meetingId,
          targetSocketId,
          candidate: event.candidate,
        });
      };

      pc.ontrack = (event) => {
        // Normally event.streams[0] exists because addTrack() was given
        // localStream.current. Keep a fallback for browsers that omit it.
        let stream = event.streams?.[0];

        if (!stream) {
          const current = remoteParticipants[targetSocketId]?.stream;

          if (current) {
            stream = current;
          } else {
            stream = new MediaStream();
          }

          if (!stream.getTracks().some((track) => track.id === event.track.id)) {
            stream.addTrack(event.track);
          }
        }

        setRemoteParticipants((prev) => ({
          ...prev,
          [targetSocketId]: {
            ...(prev[targetSocketId] || {}),
            socketId: targetSocketId,
            stream,
          },
        }));
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;

        setRemoteParticipants((prev) => {
          if (!prev[targetSocketId]) return prev;

          return {
            ...prev,
            [targetSocketId]: {
              ...prev[targetSocketId],
              connectionState: state,
            },
          };
        });

        if (state === "failed") {
          console.warn("WebRTC connection failed:", targetSocketId);

          // Try an ICE restart when possible.
          pc.restartIce?.();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(
          `ICE ${targetSocketId}: ${pc.iceConnectionState}`
        );
      };

      peerConnections.current.set(targetSocketId, pc);
      pendingCandidates.current.set(targetSocketId, []);

      return pc;
    },
    [meetingId]
  );

  const flushPendingCandidates = async (targetSocketId, pc) => {
    const queued = pendingCandidates.current.get(targetSocketId) || [];
    pendingCandidates.current.set(targetSocketId, []);

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Error adding queued ICE candidate:", err);
      }
    }
  };

  const removePeer = useCallback((targetSocketId) => {
    const pc = peerConnections.current.get(targetSocketId);

    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    }

    peerConnections.current.delete(targetSocketId);
    pendingCandidates.current.delete(targetSocketId);
    remoteVideoRefs.current.delete(targetSocketId);

    setRemoteParticipants((prev) => {
      const next = { ...prev };
      delete next[targetSocketId];
      return next;
    });
  }, []);

  // ------------------------------------------------------------
  // existingParticipants
  // The new joiner creates offers to everyone already in the room.
  // ------------------------------------------------------------
  useEffect(() => {
    const handleExistingParticipants = async (participants) => {
      if (!Array.isArray(participants)) return;

      for (const participant of participants) {
        const { socketId, userInfo } = participant;

        if (!socketId || socketId === socket.id) continue;

        setRemoteParticipants((prev) => ({
          ...prev,
          [socketId]: {
            ...(prev[socketId] || {}),
            socketId,
            userInfo,
          },
        }));

        const pc = createPeerConnection(socketId);

        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });

          await pc.setLocalDescription(offer);

          socket.emit("offer", {
            roomId: meetingId,
            targetSocketId: socketId,
            offer: pc.localDescription,
          });
        } catch (err) {
          console.error("Error creating offer to", socketId, err);
        }
      }
    };

    socket.on("existingParticipants", handleExistingParticipants);

    return () => {
      socket.off("existingParticipants", handleExistingParticipants);
    };
  }, [createPeerConnection, meetingId]);

  // ------------------------------------------------------------
  // Someone new joined. They will create the offer.
  // ------------------------------------------------------------
  useEffect(() => {
    const handleNewParticipant = ({ socketId, userInfo }) => {
      if (!socketId || socketId === socket.id) return;

      setRemoteParticipants((prev) => ({
        ...prev,
        [socketId]: {
          ...(prev[socketId] || {}),
          socketId,
          userInfo,
        },
      }));
    };

    socket.on("newParticipant", handleNewParticipant);

    return () => socket.off("newParticipant", handleNewParticipant);
  }, []);

  // ------------------------------------------------------------
  // Offer
  // ------------------------------------------------------------
  useEffect(() => {
    const handleOffer = async ({ fromSocketId, offer }) => {
      if (!fromSocketId || !offer) return;

      try {
        let pc = peerConnections.current.get(fromSocketId);

        if (!pc || pc.connectionState === "closed") {
          pc = createPeerConnection(fromSocketId);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        await flushPendingCandidates(fromSocketId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", {
          roomId: meetingId,
          targetSocketId: fromSocketId,
          answer: pc.localDescription,
        });
      } catch (err) {
        console.error("OFFER ERROR from", fromSocketId, err);
      }
    };

    socket.on("offer", handleOffer);

    return () => socket.off("offer", handleOffer);
  }, [createPeerConnection, meetingId]);

  // ------------------------------------------------------------
  // Answer
  // ------------------------------------------------------------
  useEffect(() => {
    const handleAnswer = async ({ fromSocketId, answer }) => {
      if (!fromSocketId || !answer) return;

      const pc = peerConnections.current.get(fromSocketId);

      if (!pc) {
        console.warn("No peer connection for answer from", fromSocketId);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingCandidates(fromSocketId, pc);
      } catch (err) {
        console.error("ANSWER ERROR from", fromSocketId, err);
      }
    };

    socket.on("answer", handleAnswer);

    return () => socket.off("answer", handleAnswer);
  }, []);

  // ------------------------------------------------------------
  // ICE candidate
  // ------------------------------------------------------------
  useEffect(() => {
    const handleIceCandidate = async ({ fromSocketId, candidate }) => {
      if (!fromSocketId || !candidate) return;

      const pc = peerConnections.current.get(fromSocketId);
      const iceCandidate = new RTCIceCandidate(candidate);

      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(iceCandidate);
        } catch (err) {
          console.warn("ICE candidate error:", err);
        }
      } else {
        const queue =
          pendingCandidates.current.get(fromSocketId) || [];

        queue.push(iceCandidate);
        pendingCandidates.current.set(fromSocketId, queue);
      }
    };

    socket.on("iceCandidate", handleIceCandidate);

    return () => socket.off("iceCandidate", handleIceCandidate);
  }, []);

  // ------------------------------------------------------------
  // Peer left
  // ------------------------------------------------------------
  useEffect(() => {
    const handlePeerLeft = ({ socketId }) => {
      console.log("Peer left:", socketId);
      removePeer(socketId);
    };

    socket.on("peerLeft", handlePeerLeft);

    return () => socket.off("peerLeft", handlePeerLeft);
  }, [removePeer]);

  // ------------------------------------------------------------
  // Room full
  // ------------------------------------------------------------
  useEffect(() => {
    const handleRoomFull = () => setRoomFullError(true);

    socket.on("roomFull", handleRoomFull);

    return () => socket.off("roomFull", handleRoomFull);
  }, []);

  // ------------------------------------------------------------
  // Fetch meeting + join Socket.IO room.
  //
  // We wait until the media setup effect has finished before joining.
  // This is the main fix for the "camera is on but other user sees blank"
  // problem: the first WebRTC offer now contains the local audio/video tracks.
  // ------------------------------------------------------------
  useEffect(() => {
    if (!meetingId || !mediaReady || hasJoinedRoom.current) return;

    let cancelled = false;

    const joinRoom = () => {
      if (
        cancelled ||
        hasJoinedRoom.current ||
        !meetingId ||
        !socket.connected
      ) {
        return;
      }

      const user = getCurrentUser();

      socket.emit("joinRoom", meetingId, {
        name: user?.name || "Guest",
      });

      hasJoinedRoom.current = true;
      joiningRoom.current = false;

      console.log("Joined meeting room:", meetingId);
    };

    const fetchMeeting = async () => {
      try {
        setMeetingError(null);

        const res = await API.get(`/meetings/${meetingId}`);

        if (cancelled) return;

        setMeeting(res.data);

        if (socket.connected) {
          joinRoom();
        } else {
          joiningRoom.current = true;
          socket.once("connect", joinRoom);
        }
      } catch (error) {
        console.error("Meeting fetch error:", error);

        if (!cancelled) {
          const status = error?.response?.status;

          if (status === 401) {
            setMeetingError(
              "Your login session is expired or invalid. Please login again."
            );
          } else if (status === 404) {
            setMeetingError("Meeting not found.");
          } else {
            setMeetingError(
              error?.response?.data?.message ||
                "Could not load this meeting."
            );
          }
        }
      }
    };

    fetchMeeting();

    return () => {
      cancelled = true;
      socket.off("connect", joinRoom);
    };
  }, [meetingId, mediaReady]);

  // ------------------------------------------------------------
  // Reconnect handling.
  // ------------------------------------------------------------
  useEffect(() => {
    const handleDisconnect = (reason) => {
      console.warn("Socket disconnected:", reason);
      hasJoinedRoom.current = false;

      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();

      setRemoteParticipants({});
    };

    const handleConnect = () => {
      console.log("Socket connected:", socket.id);

      if (!meetingId || hasJoinedRoom.current) return;

      const user = getCurrentUser();

      socket.emit("joinRoom", meetingId, {
        name: user?.name || "Guest",
      });

      hasJoinedRoom.current = true;
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("disconnect", handleDisconnect);
      socket.off("connect", handleConnect);
    };
  }, [meetingId]);

  // ------------------------------------------------------------
  // Chat
  // ------------------------------------------------------------
  useEffect(() => {
    const handleReceive = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on("receiveMessage", handleReceive);

    return () => socket.off("receiveMessage", handleReceive);
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;

    const user = getCurrentUser();

    const msg = {
      roomId: meetingId,
      sender: user?.name || "Guest",
      text: message.trim(),
    };

    socket.emit("sendMessage", msg);
    setMessage("");
  };

  // ------------------------------------------------------------
  // Mic / camera controls
  // ------------------------------------------------------------
  const toggleMic = () => {
    const enabled = !micOn;

    localStream.current
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });

    setMicOn(enabled);
  };

  const toggleCamera = () => {
    const enabled = !cameraOn;

    localStream.current
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = enabled;
      });

    setCameraOn(enabled);
  };

  // ------------------------------------------------------------
  // Screen sharing
  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Meeting recording
  // ------------------------------------------------------------
  const getSupportedRecordingMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    return mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

 const uploadRecording = async (blob) => {
  if (!blob || blob.size === 0) {
    setRecordingError("The recording is empty. Please try again.");
    return;
  }

  if (!meetingId) {
    setRecordingError("Meeting ID is missing.");
    return;
  }

  try {
    setRecordingError(null);

    const formData = new FormData();

    formData.append(
      "recording",
      blob,
      `${meeting?.title || "IntelliMeet-Meeting"}.webm`
    );

    const response = await API.post(
      `/meetings/${meetingId}/recording`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("Recording uploaded successfully:", response.data);

    // Update local meeting state immediately
    setMeeting((prev) => ({
      ...prev,
      recordingUrl:
        response.data?.recordingUrl ||
        response.data?.meeting?.recordingUrl ||
        prev?.recordingUrl ||
        "",
      isRecorded: true,
    }));

    // Optional browser download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const title = String(meeting?.title || "IntelliMeet-Meeting")
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 80);

    link.href = url;
    link.download = `${title}-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.webm`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("RECORDING UPLOAD ERROR:", error);

    setRecordingError(
      error?.response?.data?.message ||
        "Recording upload failed. Please try again."
    );
  }
};

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorder.current;

    if (!recorder) {
      setIsRecording(false);
      recordingSource.current = null;
      return;
    }

    if (recorder.state === "inactive") {
      mediaRecorder.current = null;
      setIsRecording(false);
      recordingSource.current = null;
      return;
    }

    recorder.stop();
  }, []);

  const startRecording = useCallback(() => {
    setRecordingError(null);

    if (typeof MediaRecorder === "undefined") {
      setRecordingError("Recording is not supported by this browser.");
      return;
    }

    if (mediaRecorder.current?.state === "recording") return;

    const cameraStream = localStream.current;
    const screen = screenStream.current;

    // Record the currently visible local source:
    // - screen + microphone when screen sharing is active
    // - camera + microphone otherwise
    const videoTrack = screen?.getVideoTracks()?.[0] ||
      cameraStream?.getVideoTracks()?.[0];

    const audioTrack = cameraStream?.getAudioTracks()?.[0];
    console.log("AUDIO TRACK:", audioTrack);
    console.log("AUDIO TRACK ENABLED:", audioTrack?.enabled);
    console.log("AUDIO TRACK STATE:", audioTrack?.readyState);

    if (!videoTrack) {
      setRecordingError(
        "No video stream is available. Please turn on your camera or start screen sharing."
      );
      return;
    }

    // The recording must contain both video and microphone audio.
    // Do not silently create a video-only recording when the microphone
    // track is missing or inactive.
    if (!audioTrack) {
      setRecordingError(
        "Microphone audio is not available. Please allow microphone access and reload the meeting."
      );
      return;
    }

    if (audioTrack.readyState !== "live") {
      setRecordingError(
        "Microphone audio track is not active. Please turn the microphone on and try again."
      );
      return;
    }

    // Make sure the microphone track is enabled when recording starts.
    // This prevents a muted/disabled track from producing a silent recording.
    audioTrack.enabled = true;
    setMicOn(true);

    const recordingStream = new MediaStream([
      videoTrack,
      audioTrack,
    ]);
    const mimeType = getSupportedRecordingMimeType();

    try {
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(recordingStream, options);

      recordingChunks.current = [];
      recordingSource.current = screen ? "screen" : "camera";
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunks.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        setRecordingError(
          "Recording stopped because the browser could not continue recording."
        );
        setIsRecording(false);
        recordingSource.current = null;
        mediaRecorder.current = null;
      };

      recorder.onstop = async () => {
  const chunks = recordingChunks.current;

  const blobType =
    recorder.mimeType || mimeType || "video/webm";

  const blob = new Blob(chunks, {
    type: blobType,
  });

  recordingChunks.current = [];
  mediaRecorder.current = null;
  recordingSource.current = null;
  setIsRecording(false);

  // Upload recording to backend
  await uploadRecording(blob);
};

      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error("Could not start recording:", err);
      mediaRecorder.current = null;
      recordingSource.current = null;
      setIsRecording(false);
      setRecordingError(
        "Could not start recording. Please check your browser permissions and try again."
      );
    }
  }, [meeting?.title]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const stopScreenShare = useCallback(() => {
    const stream = screenStream.current;

    if (!stream) return;

    // A MediaRecorder cannot safely switch its video track after recording
    // starts. If the recording was using the shared screen, finish that
    // recording cleanly before restoring the camera.
    if (recordingSource.current === "screen") {
      stopRecording();
    }

    const cameraTrack = localStream.current?.getVideoTracks()?.[0];

    // Put the camera track back into every existing peer connection.
    peerConnections.current.forEach((pc) => {
      const sender = pc
        .getSenders()
        .find((item) => item.track?.kind === "video");

      if (sender && cameraTrack) {
        sender.replaceTrack(cameraTrack).catch((err) => {
          console.error("Could not restore camera track:", err);
        });
      }
    });

    stream.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });

    screenStream.current = null;
    setIsScreenSharing(false);

    // Restore the local preview to the camera.
    if (localStream.current) {
      setLocalVideoStream(localStream.current);
    }
  }, []);

  const startScreenShare = async () => {
    if (screenStream.current) return;

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setCameraError("Screen sharing is not supported by this browser.");
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
        },
        audio: false,
      });

      const screenTrack = displayStream.getVideoTracks()?.[0];

      if (!screenTrack) {
        displayStream.getTracks().forEach((track) => track.stop());
        return;
      }

      screenStream.current = displayStream;

      // The browser's native "Stop sharing" button ends this track.
      screenTrack.onended = () => {
        stopScreenShare();
      };

      // Replace the camera video sender with the screen video sender.
      peerConnections.current.forEach((pc) => {
        const sender = pc
          .getSenders()
          .find((item) => item.track?.kind === "video");

        if (sender) {
          sender.replaceTrack(screenTrack).catch((err) => {
            console.error("Could not start screen sharing for peer:", err);
          });
        }
      });

      setIsScreenSharing(true);

      // Show the shared screen in the local "You" tile too.
      setLocalVideoStream(displayStream);
    } catch (err) {
      // User closing the browser picker is normal and should not show an error.
      if (err?.name !== "AbortError" && err?.name !== "NotAllowedError") {
        console.error("Screen sharing error:", err);
        setCameraError(
          "Could not start screen sharing. Please try again."
        );
      }
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  // ------------------------------------------------------------
  // Leave meeting
  // ------------------------------------------------------------
  const handleLeave = () => {
    hasJoinedRoom.current = false;

    // Finish an active recording before leaving the meeting so the file is
    // finalized and downloaded instead of being lost.
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    joiningRoom.current = false;

    // Stop screen sharing first, then explicitly release camera/microphone
    // when the user really leaves the meeting.
    if (screenStream.current) {
      screenStream.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      screenStream.current = null;
    }

    setIsScreenSharing(false);
    stopSharedLocalStream();
    localStream.current = null;

    peerConnections.current.forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    });
    peerConnections.current.clear();
    pendingCandidates.current.clear();
    remoteVideoRefs.current.clear();

    setLocalVideoStream(null);
    setMediaReady(false);
    setRemoteParticipants({});

    navigate(from);
  };

  // ------------------------------------------------------------
  // Remote video ref
  // ------------------------------------------------------------
  const setRemoteVideoRef = (socketId, stream) => (element) => {
    if (!element) {
      remoteVideoRefs.current.delete(socketId);
      return;
    }

    remoteVideoRefs.current.set(socketId, element);

    if (stream && element.srcObject !== stream) {
      element.srcObject = stream;
    }

    element.play().catch(() => {});
  };

  const remoteList = Object.values(remoteParticipants);
  const tileCount = remoteList.length + 1;

  const gridColsClass =
    tileCount <= 1
      ? "grid-cols-1"
      : tileCount <= 4
        ? "grid-cols-2"
        : "grid-cols-2 md:grid-cols-3";

  // ------------------------------------------------------------
  // Error states
  // ------------------------------------------------------------
  if (roomFullError) {
    return (
      <div className="min-h-screen bg-[#202124] flex flex-col items-center justify-center text-white gap-4">
        <p className="text-lg">This meeting is full.</p>
        <p className="text-sm text-gray-400">
          Mesh calls support up to 6 participants right now.
        </p>

        <button
          onClick={handleLeave}
          className="bg-[#3c4043] hover:bg-[#4a4d4f] px-5 py-2 rounded-full"
        >
          Go back
        </button>
      </div>
    );
  }

  if (meetingError) {
    return (
      <div className="min-h-screen bg-[#202124] flex flex-col items-center justify-center text-white gap-4 px-6 text-center">
        <p className="text-lg">Unable to open meeting</p>
        <p className="text-sm text-gray-400">{meetingError}</p>

        <button
          onClick={handleLeave}
          className="bg-[#3c4043] hover:bg-[#4a4d4f] px-5 py-2 rounded-full"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center text-white">
        Loading meeting...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202124] text-white flex flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-6 py-3 bg-[#202124] border-b border-[#3c4043]">
        <div>
          <h1 className="text-base font-medium text-gray-100">
            {meeting.title}
          </h1>

          <p className="text-gray-400 text-xs mt-0.5">
            {meeting.meetingCode} · {tileCount}{" "}
            {tileCount === 1 ? "participant" : "participants"}
          </p>
        </div>

        <button
          onClick={handleLeave}
          className="bg-[#ea4335] hover:bg-[#d33a2c] text-sm px-4 py-2 rounded-full font-medium"
        >
          Leave call
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-auto">
        {/* Video grid */}
        <div className={`flex-1 grid ${gridColsClass} gap-2 p-2`}>
          {/* Local tile */}
          <div className="relative bg-[#3c4043] rounded-xl overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${
                cameraOn && !cameraError ? "" : "hidden"
              }`}
            />

            {cameraError ? (
              <div className="flex flex-col items-center gap-2 text-center px-6 text-sm text-gray-300">
                <span className="text-2xl">🚫</span>
                <span>{cameraError}</span>
              </div>
            ) : (
              !cameraOn && (
                <div className="w-16 h-16 rounded-full bg-[#5f6368] flex items-center justify-center text-2xl font-medium">
                  {(getCurrentUser()?.name || "Y")[0].toUpperCase()}
                </div>
              )
            )}

            <span className="absolute bottom-2 left-3 text-sm bg-black/40 px-2 py-0.5 rounded">
              You {!micOn && "🔇"}
            </span>

            {isScreenSharing && (
              <span className="absolute top-2 left-2 text-xs bg-black/60 px-2 py-1 rounded">
                🖥 Sharing screen
              </span>
            )}
          </div>

          {/* Remote tiles */}
          {remoteList.map(
            ({ socketId, userInfo, stream, connectionState }) => (
              <div
                key={socketId}
                className="relative bg-[#3c4043] rounded-xl overflow-hidden aspect-video flex items-center justify-center"
              >
                {stream ? (
                  <video
                    ref={setRemoteVideoRef(socketId, stream)}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 text-sm">
                    <div className="w-16 h-16 rounded-full bg-[#5f6368] flex items-center justify-center text-2xl font-medium text-white">
                      {(userInfo?.name || "?")[0].toUpperCase()}
                    </div>

                    <span>
                      {connectionState === "failed"
                        ? "Connection failed"
                        : "Connecting..."}
                    </span>
                  </div>
                )}

                <span className="absolute bottom-2 left-3 text-sm bg-black/40 px-2 py-0.5 rounded">
                  {userInfo?.name || "Participant"}
                  {(connectionState === "disconnected" ||
                    connectionState === "failed") &&
                    " (reconnecting...)"}
                </span>
              </div>
            )
          )}
        </div>

        {/* Side panel */}
        {(participantsOpen || chatOpen) && (
          <div className="w-80 bg-[#2a2b2e] border-l border-[#3c4043] flex flex-col">
            {participantsOpen && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <h3 className="text-base font-medium mb-3">
                  People ({tileCount})
                </h3>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#5f6368] flex items-center justify-center text-xs">
                      {(getCurrentUser()?.name || "Y")[0].toUpperCase()}
                    </span>
                    You
                  </li>

                  {remoteList.map(({ socketId, userInfo }) => (
                    <li key={socketId} className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#5f6368] flex items-center justify-center text-xs">
                        {(userInfo?.name || "?")[0].toUpperCase()}
                      </span>

                      {userInfo?.name || "Participant"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {chatOpen && (
              <div className="flex-1 flex flex-col p-4 min-h-0">
                <h3 className="text-base font-medium mb-3">
                  In-call messages
                </h3>

                <div className="flex-1 overflow-y-auto space-y-2 mb-3 text-sm">
                  {messages.map((msg, index) => (
                    <p key={index}>
                      <span className="text-[#8ab4f8] font-medium">
                        {msg.sender}:
                      </span>{" "}
                      {msg.text}
                    </p>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Send a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && sendMessage()
                    }
                    className="flex-1 p-2 rounded-lg bg-[#3c4043] text-sm outline-none"
                  />

                  <button
                    onClick={sendMessage}
                    className="bg-[#8ab4f8] text-[#202124] px-3 rounded-lg text-sm font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {recordingError && (
        <div className="px-4 pb-2 flex justify-center">
          <div className="bg-[#3c4043] border border-[#5f6368] rounded-lg px-4 py-2 text-sm text-gray-200">
            {recordingError}
            <button
              onClick={() => setRecordingError(null)}
              className="ml-3 text-gray-400 hover:text-white"
              aria-label="Dismiss recording error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="flex justify-center items-center gap-2 py-3 flex-wrap">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            micOn
              ? "bg-[#3c4043] hover:bg-[#4a4d4f]"
              : "bg-[#ea4335]"
          }`}
          title={micOn ? "Turn off microphone" : "Turn on microphone"}
        >
          {micOn ? "🎤" : "🔇"}
        </button>

        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            cameraOn
              ? "bg-[#3c4043] hover:bg-[#4a4d4f]"
              : "bg-[#ea4335]"
          }`}
          title={cameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {cameraOn ? "🎥" : "🚫"}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            isScreenSharing
              ? "bg-[#ea4335] hover:bg-[#d33a2c]"
              : "bg-[#3c4043] hover:bg-[#4a4d4f]"
          }`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
          aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? "⏹" : "🖥"}
        </button>

        <button
          onClick={() => {
            setChatOpen((v) => !v);
            setParticipantsOpen(false);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            chatOpen
              ? "bg-[#8ab4f8] text-[#202124]"
              : "bg-[#3c4043] hover:bg-[#4a4d4f]"
          }`}
          title="Chat"
        >
          💬
        </button>

        <button
          onClick={() => {
            setParticipantsOpen((v) => !v);
            setChatOpen(false);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            participantsOpen
              ? "bg-[#8ab4f8] text-[#202124]"
              : "bg-[#3c4043] hover:bg-[#4a4d4f]"
          }`}
          title="Show participants"
        >
          👥
        </button>

        <button
          onClick={toggleRecording}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            isRecording
              ? "bg-[#ea4335] hover:bg-[#d33a2c]"
              : "bg-[#3c4043] hover:bg-[#4a4d4f]"
          }`}
          title={isRecording ? "Stop recording" : "Start recording"}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? "⏹" : "⏺"}
        </button>

        <button
          onClick={handleLeave}
          className="px-6 h-12 rounded-full bg-[#ea4335] hover:bg-[#d33a2c] font-medium ml-2"
        >
          Leave
        </button>
      </div>
    </div>
  );
}

export default MeetingRoom;
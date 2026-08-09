import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
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

  const localVideoRef = useRef(null);
  const localStream = useRef(null);

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

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream.current = stream;
        setLocalVideoStream(stream);
        setMediaReady(true);
        setCameraError(null);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          try {
            await localVideoRef.current.play();
          } catch {
            // Browser may require the element to finish mounting first.
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

        // Do not permanently block the meeting if the camera is unavailable.
        // We still allow the room to join.
        setMediaReady(true);
      }
    };

    startCamera();

    return () => {
      cancelled = true;

      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
        localStream.current = null;
      }

      setLocalVideoStream(null);
      setMediaReady(false);

      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();
    };
  }, []);

  // Always attach the local MediaStream after React has mounted the video.
  useEffect(() => {
  const video = localVideoRef.current;

  console.log("🎥 LOCAL VIDEO EFFECT");
  console.log("Video element:", video);
  console.log("Local stream:", localVideoStream);
  console.log("Stream tracks:", localVideoStream?.getTracks());

  if (!video) {
    console.log("❌ localVideoRef.current is NULL");
    return;
  }

  if (!localVideoStream) {
    console.log("❌ localVideoStream is NULL");
    return;
  }

  video.srcObject = localVideoStream;

  console.log("✅ srcObject attached:", video.srcObject);

  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;

  video.play()
    .then(() => {
      console.log("✅ LOCAL VIDEO PLAYING");
    })
    .catch((err) => {
      console.error("❌ VIDEO PLAY ERROR:", err);
    });
}, [localVideoStream]);

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

      // IMPORTANT:
      // Add local tracks immediately. The old implementation could create
      // the PeerConnection before getUserMedia finished, resulting in an
      // offer with no video track and therefore a blank remote tile.
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          const alreadyAdded = pc
            .getSenders()
            .some((sender) => sender.track === track);

          if (!alreadyAdded) {
            pc.addTrack(track, localStream.current);
          }
        });
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
  // Leave meeting
  // ------------------------------------------------------------
  const handleLeave = () => {
    hasJoinedRoom.current = false;

    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    pendingCandidates.current.clear();

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
          onClick={() => navigate(from)}
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
          onClick={() => navigate(from)}
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
          className="w-12 h-12 rounded-full bg-[#3c4043] hover:bg-[#4a4d4f] flex items-center justify-center text-lg"
          title="Share screen (not yet implemented)"
        >
          🖥
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
          className="w-12 h-12 rounded-full bg-[#3c4043] hover:bg-[#4a4d4f] flex items-center justify-center text-lg"
          title="Record (not yet implemented)"
        >
          ⏺
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
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import API from "../services/api";
import socket from "../socket";

// STUN-only ICE config. This works for peers on simple/open NATs but will
// fail for a meaningful fraction of real-world users (symmetric NAT,
// strict corporate firewalls, some mobile carriers). Before shipping this
// beyond same-network testing, add a TURN server here, e.g.:
//
// const ICE_SERVERS = [
//   { urls: "stun:stun.l.google.com:19302" },
//   { urls: "turn:your-turn-host:3478", username: "...", credential: "..." },
// ];
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

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

  // Remote participants, keyed by socketId. Each entry:
  // { socketId, userInfo, stream, connectionState }
  // This replaces the old single remoteVideoRef/remotePeerConnected model
  // with a structure that can hold any number of peers.
  const [remoteParticipants, setRemoteParticipants] = useState({});

  const localVideoRef = useRef(null);
  const localStream = useRef(null);
  // Mirrors localStream.current in React state so the attach-effect below
  // can re-run reliably whenever the stream becomes available, instead of
  // relying on localVideoRef.current already being non-null at the exact
  // moment getUserMedia resolves (the same mount-timing race we fixed for
  // remote tiles).
  const [localVideoStream, setLocalVideoStream] = useState(null);
  // Surfaces getUserMedia failures (camera in use by another tab/app,
  // permission denied, no device found) instead of silently leaving a
  // gray tile with no explanation.
  const [cameraError, setCameraError] = useState(null);

  // Map<socketId, RTCPeerConnection> — one connection per remote peer,
  // instead of the old single `peerConnection` ref. This is the core
  // change that makes group calls possible: every peer in the room gets
  // its own RTCPeerConnection on this client.
  const peerConnections = useRef(new Map());

  // Map<socketId, RTCIceCandidate[]> — ICE candidates queued per-peer
  // until that specific peer's remote description is set.
  const pendingCandidates = useRef(new Map());

  // Map<socketId, HTMLVideoElement> — refs to each remote <video> tile,
  // set via a ref callback since the number of tiles is dynamic.
  const remoteVideoRefs = useRef(new Map());

  const meetingId = location.state?.meetingId || location.state?.meeting?._id;
  const from = location.state?.from || "/dashboard";

  const getCurrentUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  };

  // ---- Create a new RTCPeerConnection for a given remote socket ----
  const createPeerConnection = useCallback(
    (targetSocketId) => {
      // GUARD: if a connection already exists for this peer (e.g. a
      // duplicate "existingParticipants"/"newParticipant" event from a
      // double-fired effect, or a reconnect that the server didn't
      // clean up yet), close the stale one first instead of silently
      // orphaning it. An orphaned connection keeps its old ontrack
      // handler alive and can intermittently fire with no live tracks,
      // which is what produces a black "ghost" tile.
      const existingPc = peerConnections.current.get(targetSocketId);
      if (existingPc) {
        existingPc.close();
        peerConnections.current.delete(targetSocketId);
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("iceCandidate", {
            roomId: meetingId,
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Single flat ontrack handler (no nested reassignment). Fires once
      // per track; since both audio+video tracks for a peer share the
      // same MediaStream, updating state on every call is safe.
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;

        setRemoteParticipants((prev) => ({
          ...prev,
          [targetSocketId]: {
            ...(prev[targetSocketId] || {}),
            socketId: targetSocketId,
            stream,
          },
        }));
      };

      pc.oniceconnectionstatechange = () => {
        setRemoteParticipants((prev) => {
          if (!prev[targetSocketId]) return prev;
          return {
            ...prev,
            [targetSocketId]: {
              ...prev[targetSocketId],
              connectionState: pc.iceConnectionState,
            },
          };
        });

        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          console.log(
            `Connection to ${targetSocketId} is ${pc.iceConnectionState}`,
          );
        }
      };

      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStream.current);
        });
      }

      peerConnections.current.set(targetSocketId, pc);
      pendingCandidates.current.set(targetSocketId, []);

      return pc;
    },
    [meetingId],
  );

  const flushPendingCandidates = async (targetSocketId, pc) => {
    const queued = pendingCandidates.current.get(targetSocketId) || [];
    pendingCandidates.current.set(targetSocketId, []);

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.log("Error flushing queued ICE candidate:", err);
      }
    }
  };

  // ---- Tear down the connection + tile for one peer ----
  const removePeer = useCallback((targetSocketId) => {
    const pc = peerConnections.current.get(targetSocketId);
    pc?.close();
    peerConnections.current.delete(targetSocketId);
    pendingCandidates.current.delete(targetSocketId);
    remoteVideoRefs.current.delete(targetSocketId);

    setRemoteParticipants((prev) => {
      const next = { ...prev };
      delete next[targetSocketId];
      return next;
    });
  }, []);

  // ---- Camera/mic setup (runs once) ----
  useEffect(() => {
    let stream;
    let cancelled = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStream.current = stream;
        setLocalVideoStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.log(err);

        // Translate common getUserMedia failures into a message that
        // actually tells the user what to do, instead of a permanently
        // unexplained gray tile.
        if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setCameraError(
            "Camera is already in use by another tab or app. Close other tabs using the camera and reload.",
          );
        } else if (err.name === "NotAllowedError") {
          setCameraError(
            "Camera/microphone permission was denied. Allow access in your browser settings and reload.",
          );
        } else if (err.name === "NotFoundError") {
          setCameraError("No camera or microphone was found on this device.");
        } else {
          setCameraError("Could not access camera/microphone: " + err.message);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      // Close every peer connection on unmount, not just one.
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();
    };
  }, []);

  // Safety net for the local video element: re-attach srcObject whenever
  // the stream or the ref changes. This catches the case where the
  // <video> element wasn't mounted yet at the moment getUserMedia
  // resolved (e.g. briefly hidden behind a loading state) — the direct
  // assignment above would silently no-op, but this effect re-runs and
  // catches up as soon as both exist.
  useEffect(() => {
    if (localVideoRef.current && localVideoStream) {
      localVideoRef.current.srcObject = localVideoStream;
    }
  }, [localVideoStream]);

  // ---- existingParticipants: we just joined, create offers to each ----
  useEffect(() => {
    const handleExistingParticipants = async (participants) => {
      for (const { socketId, userInfo } of participants) {
        setRemoteParticipants((prev) => ({
          ...prev,
          [socketId]: { ...(prev[socketId] || {}), socketId, userInfo },
        }));

        const pc = createPeerConnection(socketId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit("offer", {
            roomId: meetingId,
            targetSocketId: socketId,
            offer,
          });
        } catch (err) {
          console.log("Error creating offer to", socketId, err);
        }
      }
    };

    socket.on("existingParticipants", handleExistingParticipants);
    return () => socket.off("existingParticipants", handleExistingParticipants);
  }, [createPeerConnection, meetingId]);

  // ---- newParticipant: someone else joined; just render a placeholder.
  // We do NOT create an offer here — the new joiner initiates the offer
  // to us (see existingParticipants above), avoiding the classic
  // "both sides create an offer simultaneously" glare problem. ----
  useEffect(() => {
    const handleNewParticipant = ({ socketId, userInfo }) => {
      setRemoteParticipants((prev) => ({
        ...prev,
        [socketId]: { ...(prev[socketId] || {}), socketId, userInfo },
      }));
    };

    socket.on("newParticipant", handleNewParticipant);
    return () => socket.off("newParticipant", handleNewParticipant);
  }, []);

  // ---- Offer received from a specific peer ----
  useEffect(() => {
    const handleOffer = async (data) => {
      const { fromSocketId, offer } = data;

      try {
        let pc = peerConnections.current.get(fromSocketId);
        if (!pc) {
          pc = createPeerConnection(fromSocketId);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingCandidates(fromSocketId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", {
          roomId: meetingId,
          targetSocketId: fromSocketId,
          answer,
        });
      } catch (err) {
        console.log("OFFER ERROR from", fromSocketId, err);
      }
    };

    socket.on("offer", handleOffer);
    return () => socket.off("offer", handleOffer);
  }, [createPeerConnection, meetingId]);

  // ---- Answer received from a specific peer ----
  useEffect(() => {
    const handleAnswer = async (data) => {
      const { fromSocketId, answer } = data;
      const pc = peerConnections.current.get(fromSocketId);

      if (!pc) {
        console.log("No peer connection for answer from", fromSocketId);
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await flushPendingCandidates(fromSocketId, pc);
      } catch (err) {
        console.log("ANSWER ERROR from", fromSocketId, err);
      }
    };

    socket.on("answer", handleAnswer);
    return () => socket.off("answer", handleAnswer);
  }, []);

  // ---- ICE candidate received from a specific peer ----
  useEffect(() => {
    const handleIceCandidate = async (data) => {
      const { fromSocketId, candidate } = data;
      const pc = peerConnections.current.get(fromSocketId);
      const iceCandidate = new RTCIceCandidate(candidate);

      if (pc?.remoteDescription) {
        try {
          await pc.addIceCandidate(iceCandidate);
        } catch (err) {
          console.log(err);
        }
      } else {
        const queue = pendingCandidates.current.get(fromSocketId) || [];
        queue.push(iceCandidate);
        pendingCandidates.current.set(fromSocketId, queue);
      }
    };

    socket.on("iceCandidate", handleIceCandidate);
    return () => socket.off("iceCandidate", handleIceCandidate);
  }, []);

  // ---- Peer left ----
  useEffect(() => {
    const handlePeerLeft = ({ socketId }) => {
      console.log("Peer left:", socketId);
      removePeer(socketId);
    };

    socket.on("peerLeft", handlePeerLeft);
    return () => socket.off("peerLeft", handlePeerLeft);
  }, [removePeer]);

  // ---- Room full ----
  useEffect(() => {
    const handleRoomFull = () => setRoomFullError(true);
    socket.on("roomFull", handleRoomFull);
    return () => socket.off("roomFull", handleRoomFull);
  }, []);

  // ---- Fetch meeting + join room ----
  const hasJoinedRoom = useRef(false);
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const res = await API.get(`/meetings/${meetingId}`);
        setMeeting(res.data);

        if (!hasJoinedRoom.current) {
          const user = getCurrentUser();
          socket.emit("joinRoom", meetingId, {
            name: user?.name || "Guest",
          });
          hasJoinedRoom.current = true;
        }
      } catch (error) {
        console.log(error);
      }
    };

    if (meetingId) fetchMeeting();
  }, [meetingId]);

  // ---- Chat ----
  useEffect(() => {
    const handleReceive = (data) => setMessages((prev) => [...prev, data]);
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

  // ---- Mic / camera toggles ----
  const toggleMic = () => {
    const enabled = !micOn;
    localStream.current
      ?.getAudioTracks()
      .forEach((track) => (track.enabled = enabled));
    setMicOn(enabled);
  };

  const toggleCamera = () => {
    const enabled = !cameraOn;
    localStream.current
      ?.getVideoTracks()
      .forEach((track) => (track.enabled = enabled));
    setCameraOn(enabled);
  };

  const handleLeave = () => {
    localStream.current?.getTracks().forEach((track) => track.stop());
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    navigate(from);
  };

  // Ref callback: attaches a remote stream to its <video> element as soon
  // as both the element and stream exist, sidestepping the React-mount
  // race condition (element not yet mounted when ontrack fires).
  const setRemoteVideoRef = (socketId, stream) => (el) => {
    if (el) {
      remoteVideoRefs.current.set(socketId, el);
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
      }
    } else {
      remoteVideoRefs.current.delete(socketId);
    }
  };

  const remoteList = Object.values(remoteParticipants);
  const tileCount = remoteList.length + 1; // + local tile

  // Grid layout that mimics Meet's auto-arranging tile grid: column count
  // grows with participant count rather than using a fixed 2-col split.
  const gridColsClass =
    tileCount <= 1
      ? "grid-cols-1"
      : tileCount === 2
        ? "grid-cols-2"
        : tileCount <= 4
          ? "grid-cols-2"
          : "grid-cols-3";

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

  if (!meeting) {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center text-white">
        Loading...
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

      {/* Main area: video grid + optional side panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div
          className={`flex-1 grid ${gridColsClass} gap-3 p-4 auto-rows-fr content-center`}
        >
          {/* Local tile */}
          <div className="relative bg-[#3c4043] rounded-xl overflow-hidden flex items-center justify-center">
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
          {remoteList.map(({ socketId, userInfo, stream, connectionState }) => (
            <div
              key={socketId}
              className="relative bg-[#3c4043] rounded-xl overflow-hidden flex items-center justify-center"
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
                  <span>Connecting...</span>
                </div>
              )}
              <span className="absolute bottom-2 left-3 text-sm bg-black/40 px-2 py-0.5 rounded">
                {userInfo?.name || "Participant"}
                {connectionState === "disconnected" && " (reconnecting...)"}
              </span>
            </div>
          ))}
        </div>

        {/* Side panel: participants or chat */}
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
                <h3 className="text-base font-medium mb-3">In-call messages</h3>
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
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
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

      {/* Bottom Controls — Meet-style floating pill bar */}
      <div className="flex justify-center items-center gap-3 py-4">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            micOn ? "bg-[#3c4043] hover:bg-[#4a4d4f]" : "bg-[#ea4335]"
          }`}
          title={micOn ? "Turn off microphone" : "Turn on microphone"}
        >
          {micOn ? "🎤" : "🔇"}
        </button>

        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${
            cameraOn ? "bg-[#3c4043] hover:bg-[#4a4d4f]" : "bg-[#ea4335]"
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

import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";
import socket from "../socket";
import { useRef } from "react";

function MeetingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const [meeting, setMeeting] = useState(null);
  const [message, setMessage] = useState("");
  const localVideoRef = useRef(null);

  const peerConnection = useRef(null);

  const localStream = useRef(null);
  const remoteVideoRef = useRef(null);
  const meetingId = location.state?.meetingId || location.state?.meeting?._id;
  const from = location.state?.from || "/dashboard";

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream.current = stream;

        localVideoRef.current.srcObject = stream;
        peerConnection.current = new RTCPeerConnection({
          iceServers: [
            {
              urls: "stun:stun.l.google.com:19302",
            },
          ],
        });
        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });
        peerConnection.current.ontrack = (event) => {
          const remoteStream = event.streams[0];

          remoteVideoRef.current.srcObject = remoteStream;
        };
        const offer = await peerConnection.current.createOffer();

        await peerConnection.current.setLocalDescription(offer);

        socket.emit("offer", {
          roomId: meetingId,
          offer,
        });
      } catch (err) {
        console.log(err);
      }
    };

    startCamera();
  }, []);

  const [messages, setMessages] = useState([]);
  const sendMessage = () => {
    if (!message.trim()) return;

    const user = JSON.parse(localStorage.getItem("user"));

    const msg = {
      roomId: meetingId,
      sender: user.name,
      text: message.trim(),
    };

    socket.emit("sendMessage", msg);

    setMessage("");
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);
    });

    const fetchMeeting = async () => {
      try {
        const res = await API.get(`/meetings/${meetingId}`);

        console.log(res.data);

        setMeeting(res.data);

        socket.emit("joinRoom", meetingId);
      } catch (error) {
        console.log(error);
      }
    };

    if (meetingId) {
      fetchMeeting();
    }

    return () => {
      socket.off("connect");
    };
  }, [meetingId]);

  useEffect(() => {
    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, []);
  useEffect(() => {
    socket.on("offer", async (data) => {
      console.log("Offer Received");

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(data.offer),
      );

      const answer = await peerConnection.current.createAnswer();

      await peerConnection.current.setLocalDescription(answer);

      socket.emit("answer", {
        roomId: meetingId,

        answer,
      });
    });

    return () => {
      socket.off("offer");
    };
  }, []);

  if (!meeting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-8 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">IntelliMeet Room</h1>

          <p className="text-gray-400 text-sm mt-1">Meeting: {meeting.title}</p>

          <p className="text-gray-500 text-sm">
            Meeting Code: {meeting.meetingCode}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-400">Duration</p>

            <p className="font-bold text-green-400">00:15:32</p>
          </div>

          <button
            onClick={() => navigate(from)}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg"
          >
            Leave Meeting
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 p-6">
        {/* Video Area */}
        <div
          className={`md:col-span-3 grid gap-4 ${
            meeting.participants.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {" "}
          <div className="bg-slate-900 rounded-xl aspect-video">
            <div className="grid grid-cols-2 gap-4">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover rounded-xl"
              />

              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>
        {/* Participants + Chat */}
        <div className="bg-slate-900 rounded-xl p-4 flex flex-col">
          <h3 className="text-xl font-bold mb-4">Participants</h3>

          <ul className="space-y-3 mb-6">
            {meeting?.participants?.map((participant) => (
              <li key={participant._id}>👤 {participant.name}</li>
            ))}
          </ul>

          <hr className="border-slate-700 mb-4" />

          <h3 className="text-xl font-bold mb-4">Chat</h3>

          <div className="bg-slate-800 rounded-lg p-3 h-40 overflow-y-auto mb-4">
            {messages.map((msg, index) => (
              <p key={index} className="mb-2">
                <span className="text-cyan-400">{msg.sender}:</span> {msg.text}
              </p>
            ))}
          </div>

          <input
            type="text"
            placeholder="Type message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 rounded-lg bg-slate-800 mb-3"
          />

          <button onClick={sendMessage} className="bg-cyan-500 py-2 rounded-lg">
            Send
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-center gap-4 pb-8 flex-wrap">
        <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
          🎤 Mic
        </button>

        <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
          🎥 Camera
        </button>

        <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
          🖥 Share Screen
        </button>

        <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
          💬 Chat
        </button>

        <button className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-xl">
          👥 Participants
        </button>

        <button className="bg-red-600 hover:bg-red-500 px-5 py-3 rounded-xl">
          ⏺ Record
        </button>
      </div>
    </div>
  );
}

export default MeetingRoom;

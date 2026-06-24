import { io } from "socket.io-client";

const socket = io("https://intellmeet-ai-powered-enterprise-meeting-nyy6.onrender.com", {
  autoConnect: true,
});

export default socket;

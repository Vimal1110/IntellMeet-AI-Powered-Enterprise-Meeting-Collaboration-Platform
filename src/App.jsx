import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreateMeeting from "./pages/CreateMeeting";
import JoinMeeting from "./pages/JoinMeeting";
import Dashboard from "./pages/Dashboard";
import MeetingRoom from "./pages/MeetingRoom";
import ScheduleMeeting from "./pages/ScheduleMeeting";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import MeetingHistory from "./pages/MeetingHistory";
import MeetingDetails from "./pages/MeetingDetails";
import AISummary from "./pages/AISummary";
import Recording from "./pages/Recording";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-meeting" element={<CreateMeeting />} />
        <Route path="/join-meeting" element={<JoinMeeting />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/meetingroom" element={<MeetingRoom />} />
        <Route path="/schedule-meeting" element={<ScheduleMeeting />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/meeting-history" element={<MeetingHistory />} />
        <Route path="/meeting-details" element={<MeetingDetails />} />
        <Route path="/ai-summary" element={<AISummary />} />
        <Route path="/recording" element={<Recording />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
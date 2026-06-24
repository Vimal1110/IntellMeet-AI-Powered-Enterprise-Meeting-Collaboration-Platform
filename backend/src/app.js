import express from "express";
import cors from "cors";
import helmet from "helmet";
import meetingRoutes from "./routes/meetingRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import analyticsRoutes from "./routes/AnalyticsRoutes.js";
import Notificationroutes from "./routes/Notificationroutes.js";
const app = express();

app.use(express.json());

app.use(cors());

app.use(helmet());

app.get("/", (req, res) => {
  res.send("IntellMeet API Running");
});

app.use("/api/auth", authRoutes);

app.use("/api/meetings", meetingRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/notifications", Notificationroutes);

export default app;

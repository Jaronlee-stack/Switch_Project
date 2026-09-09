import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import {
  register,
  login,
  logout,
  getMe,
  changePassword,
} from "./controller/authController.js";
import { authenticateJWT, requireRole } from "./middleware/auth.js";
import { getAllUsers } from "./models/authModel.js";
import { closePool } from "../dbConfig.js";
import {
  ingestFrame,
  getLatest,
  streamPosture,
  getHistoryList,
  getHistoryDetail,
} from "./controller/postureController.js";
import { listRules, addRule, editRule, removeRule } from "./controller/rulesController.js";
import { getAnalyticsSummary, getAnalyticsTrends } from "./controller/analyticsController.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const app = express();
const port = process.env.PORT || 3000;

// CORS: must specify origin when credentials=true (cannot be '*')
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5500";

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", CLIENT_URL);
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "10mb" })); // base64 camera frames need headroom over the 100kb default
app.use(cookieParser());

/* ---------- Static frontend ---------- */
// Serves everything in src/public (Dashboard.html, auth/SignIn.html, css, js, ...)
app.use(express.static(publicDir));

/* ---------- Public page routes (so the browser can navigate here directly) ---------- */
// SignIn.html is a single page that toggles between sign-in/sign-up client-side.
// ?mode= tells it which state to open in.
app.get("/login", (req, res) => {
  res.redirect("/auth/SignIn.html?mode=signin");
});
app.get("/register", (req, res) => {
  res.redirect("/auth/SignIn.html?mode=signup");
});

/* ---------- Public API ---------- */
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);
app.post("/api/auth/logout", logout);

/* ---------- Protected (any role) ---------- */
app.get("/api/user/me", authenticateJWT, getMe);
app.put("/api/user/password", authenticateJWT, changePassword);

/* ---------- Protected (superuser only) ---------- */
app.get("/api/admin/users", authenticateJWT, requireRole('superuser'), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* ---------- Ingestion pipeline (camera -> mediapipe -> rules -> ollama -> DB) ---------- */
// No user JWT here: camera.py and main.py are trusted local-network devices,
// not browser clients. Lock this down with a network firewall / device token
// before exposing the backend beyond your LAN.
app.post("/api/frame", ingestFrame);
app.get("/api/posture/latest", getLatest);
app.get("/api/posture/stream", streamPosture);

/* ---------- History ---------- */
app.get("/api/history", authenticateJWT, getHistoryList);
app.get("/api/history/:detection_id", authenticateJWT, getHistoryDetail);

/* ---------- Analytics / Dashboard ---------- */
app.get("/api/analytics/summary", authenticateJWT, getAnalyticsSummary);
app.get("/api/analytics/trends", authenticateJWT, getAnalyticsTrends);

/* ---------- Rules ---------- */
app.get("/api/rules", authenticateJWT, listRules);
app.post("/api/rules", authenticateJWT, requireRole('superuser'), addRule);
app.put("/api/rules/:id", authenticateJWT, requireRole('superuser'), editRule);
app.delete("/api/rules/:id", authenticateJWT, requireRole('superuser'), removeRule);

/* ---------- Sanity check ---------- */
app.get("/", (req, res) => {
  res.json({ message: "Habit Coach API is running" });
});

/* ---------- 404 + error handlers ---------- */
app.use((req, res) => {
  res.status(404).json({
    message: `No route for ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  try { await closePool(); } catch (err) { console.error(err); }
  server.close(() => process.exit(0));
});
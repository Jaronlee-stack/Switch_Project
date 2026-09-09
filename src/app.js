import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import { startOllamaPoller } from "./services/ollamaService.js";

import {
  register,
  login,
  logout,
  getMe,
  changePassword,
} from "./controller/authController.js";

import {
  authenticateJWT,
  requireRole
} from "./middleware/auth.js";

import {
  getAllUsers
} from "./models/authModel.js";

import {
  closePool
} from "../dbConfig.js";

import {
  ingestFrame,
  getLatest,
  streamPosture,
  getHistoryList,
  getHistoryDetail,
} from "./controller/postureController.js";

import {
  listRulesEndpoint,
  addRule,
  editRule,
  removeRule
} from "./controller/rulesController.js";

import {
  getAnalyticsSummary,
  getAnalyticsTrends
} from "./controller/analyticsController.js";

import * as stackTraceParser from "stacktrace-parser";


/* ---------- Environment ---------- */

dotenv.config();


/* ---------- Paths ---------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, "public");


/* ---------- Express ---------- */

const app = express();

const port = process.env.PORT || 3000;


/* ---------- CORS ---------- */

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5500";

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    CLIENT_URL
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Credentials",
    "true"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});


/* ---------- Middleware ---------- */

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(cookieParser());


/* ---------- Static frontend ---------- */

app.use(
  express.static(publicDir)
);


/* ---------- Public page routes ---------- */

app.get("/login", (req, res) => {
  res.redirect(
    "/auth/SignIn.html?mode=signin"
  );
});

app.get("/register", (req, res) => {
  res.redirect(
    "/auth/SignIn.html?mode=signup"
  );
});


/* ---------- Public API ---------- */

app.post(
  "/api/auth/register",
  register
);

app.post(
  "/api/auth/login",
  login
);

app.post(
  "/api/auth/logout",
  logout
);


/* ---------- Protected user routes ---------- */

app.get(
  "/api/user/me",
  authenticateJWT,
  getMe
);

app.put(
  "/api/user/password",
  authenticateJWT,
  changePassword
);


/* ---------- Admin routes ---------- */

app.get(
  "/api/admin/users",
  authenticateJWT,
  requireRole("superuser"),
  async (req, res) => {
    try {
      const users = await getAllUsers();

      res.json({
        users
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed to fetch users"
      });
    }
  }
);


/* ---------- Posture ingestion ---------- */

app.post(
  "/api/frame",
  ingestFrame
);

app.get(
  "/api/posture/latest",
  getLatest
);

app.get(
  "/api/posture/stream",
  streamPosture
);


/* ---------- History ---------- */

app.get(
  "/api/history",
  authenticateJWT,
  getHistoryList
);

app.get(
  "/api/history/:detection_id",
  authenticateJWT,
  getHistoryDetail
);


/* ---------- Analytics ---------- */

app.get(
  "/api/analytics/summary",
  authenticateJWT,
  getAnalyticsSummary
);

app.get(
  "/api/analytics/trends",
  authenticateJWT,
  getAnalyticsTrends
);


/* ---------- Rules ---------- */

app.get(
  "/api/rules",
  authenticateJWT,
  listRulesEndpoint
);

app.post(
  "/api/rules",
  authenticateJWT,
  requireRole("superuser"),
  addRule
);

app.put(
  "/api/rules/:id",
  authenticateJWT,
  requireRole("superuser"),
  editRule
);

app.delete(
  "/api/rules/:id",
  authenticateJWT,
  requireRole("superuser"),
  removeRule
);


/* ---------- Sanity check ---------- */

app.get("/", (req, res) => {
  res.json({
    message: "Habit Coach API is running"
  });
});


/* ---------- 404 ---------- */

app.use((req, res) => {
  res.status(404).json({
    message:
      `No route for ${req.method} ${req.originalUrl}`
  });
});


/* ---------- Error handler ---------- */

app.use((err, req, res, next) => {
  console.error(
    "Unhandled error:",
    err
  );

  res.status(500).json({
    message: "Internal server error"
  });
});


/* ---------- Stack trace test ---------- */

try {
  throw new Error("My error");

} catch (ex) {
  stackTraceParser.parse(ex.stack);
}


/* ---------- Start server ---------- */

const server = app.listen(
  port,
  () => {
    console.log(
      `Server running on http://localhost:${port}`
    );
  }
);


/* ---------- Start Ollama ---------- */

startOllamaPoller();


/* ---------- Graceful shutdown ---------- */

process.on(
  "SIGINT",
  async () => {

    try {
      await closePool();

    } catch (err) {
      console.error(err);
    }

    server.close(
      () => process.exit(0)
    );
  }
);
# workflow
backend = controller & model
# 1. login (RBAC): Browser -> backend -> databse to check credential
# 1a. if correct credentials -> dashboard.html
# 1b. if wrong credentials -> back to SignIn.html

# 2. camera.py sends 2 frames/sec; encoded in base64 before sending to backend
# 3. backend encodes it back into proper frames and sends it to mediapipe while also sending it to the database to be stored (posture_detections)
# 4. mediapipe gets the angles and sends data via json format back to backend and also sends the angles back to database, using a foreign key for reference to find the correct corressponding frame
# 5. ollama will be able to reference the rules_table to come out with the verdict and advice
# 6. robot will know what to do to move in main.py
# 7. Based on past frames, history, analystics and dashboard will be updated
FYI LiveCoach is where the camera will be shown 


# Habit Coach — Posture Monitoring System
## 1. What This Project Does

Habit Coach is a real-time posture monitoring web application. A camera captures your posture, Google MediaPipe analyses your body landmarks, a rule engine classifies your posture, and the dashboard shows you live feedback. An AI (Ollama running locally) generates personalised coaching advice. An optional robot dog mirrors your posture state with LED indicators and movement.

---

## 2. Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js + Express** | REST API server, serves the frontend |
| **PostgreSQL** | Stores users, detections, rules, AI recommendations |
| **JWT (jsonwebtoken)** | Cookie-based authentication |
| **Axios** | Node calls the MediaPipe Python service |
| **Ollama (llama3.2)** | Local AI model for posture coaching advice |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Vanilla JavaScript** | All pages — no framework |
| **Chart.js** | Dashboard and Analytics charts |
| **Remix Icon + Font Awesome** | UI icons |
| **Server-Sent Events (SSE)** | Real-time live feed on LiveCoach page |

### Python Services
| Technology | Purpose |
|------------|---------|
| **Python 3.11.x** | Required — MediaPipe does NOT support Python 3.13 |
| **MediaPipe 0.10.14** | Pose landmark detection |
| **OpenCV (cv2)** | Webcam capture + image encoding |
| **FastAPI + Uvicorn** | Hosts the MediaPipe microservice on port 5001 |
| **Requests** | Camera sender POSTs frames to Node backend |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker / Docker Compose** | Runs PostgreSQL in a container |
| **dotenv** | Environment variable management |

---

## 3. Project Structure & What Each File Does

```
Switch_Project/
├── .env                          # Your local environment variables (never commit this)
├── .env.example                  # Template for the .env file
├── dbConfig.js                   # PostgreSQL connection pool
├── package.json                  # Node.js dependencies
├── docker-compose.yaml           # Spins up PostgreSQL
│
├── src/
│   ├── app.js                    # Express server — all routes defined here
│   │
│   ├── camera/
│   │   ├── camera.py             # Captures webcam frames, sends to /api/frame
│   │   ├── pose_service.py       # FastAPI service — runs MediaPipe, returns angles
│   │   ├── main.py               # Robot dog controller (WaveGo — see section 8)
│   │   └── requirements.txt      # Python dependencies for the camera folder
│   │
│   ├── controller/
│   │   ├── authController.js     # register, login, logout, getMe, changePassword
│   │   ├── postureController.js  # ingestFrame, getLatest, streamPosture, getHistoryList, getHistoryDetail
│   │   ├── analyticsController.js# getAnalyticsSummary, getAnalyticsTrends
│   │   └── rulesController.js    # CRUD for posture rules (admin only)
│   │
│   ├── middleware/
│   │   └── auth.js               # authenticateJWT, requireRole — protects routes
│   │
│   ├── models/
│   │   ├── authModel.js          # DB queries for users table
│   │   ├── postureModel.js       # DB queries for posture_detections, frames, purge logic
│   │   ├── analyticsModel.js     # DB queries for summary stats and daily trends
│   │   └── rulesModel.js         # DB queries for rules_table (includes robot_action column)
│   │
│   ├── services/
│   │   ├── poseService.js        # Node calls pose_service.py — sends image, gets angles back
│   │   └── ollamaService.js      # Polls DB every 5s, sends posture data to Ollama, saves advice
│   │
│   ├── database/
│   │   └── init.sql              # Database schema — run this once to create all tables
│   │
│   └── public/                   # All frontend files — served as static by Express
│       ├── api.js                # Shared fetch utility used by all pages
│       ├── sidebar.html          # Sidebar HTML (injected dynamically)
│       ├── sidebar.js            # Loads sidebar, populates username, handles logout, active link
│       ├── sidebar.css           # Sidebar styles
│       ├── styles.css            # Global shared styles
│       │
│       ├── Dashboard.html        # Main overview page
│       ├── Dashboard.js          # Fetches posture score, status, trends, activity chart
│       ├── Dashboard.css         # Dashboard styles
│       │
│       ├── Analytics.html        # Posture analytics and trends page
│       ├── Analytics.js          # Weekly/monthly charts, issue breakdown, insight
│       ├── Analytics.css         # Analytics styles
│       │
│       ├── History.html          # Detection history table
│       ├── HIstory.js            # Fetches history, search/filter, pagination, export CSV
│       ├── History.css           # History styles
│       │
│       ├── LiveCoach.html        # Real-time posture monitoring
│       ├── LiveCoach.js          # SSE stream, live badge, alert log, fullscreen
│       ├── LiveCoach.css         # LiveCoach styles
│       │
│       └── auth/
│           ├── SignIn.html       # Login and register page
│           ├── SignIn.js         # Handles register/login form submission
│           └── SignIn.css        # Auth page styles
```

---

## 4. How It Works — Full Workflow

```
┌──────────────────────────────────────────────────┐
│  PROCESS 1: camera.py (Python 3.11)              │
│  Opens webcam → captures frame every 2s          │
│  Encodes frame as base64 JPEG                    │
│  POST /api/frame → Node backend                  │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  PROCESS 2: Node/Express (npm start)             │
│                                                  │
│  ingestFrame()                                   │
│    → decode base64 image                         │
│    → POST localhost:5001/detect                  │
│                    │                             │
│                    ▼                             │
│  PROCESS 3: pose_service.py (Python 3.11)        │
│    → MediaPipe Pose landmark detection           │
│    → calculate neck_angle, trunk_lean,           │
│       head_offset_px, person_detected            │
│    → return JSON to Node                         │
│                    │                             │
│  classifyPosture() → good / slouching /          │
│                       prolonged_slouching        │
│                    │                             │
│  findRuleByStatus() ← reads rules_table          │
│                    │                             │
│  saveDetection() → posture_detections table      │
│  purgeOldFrames() → keeps only last 500 frames   │
│                    │                             │
│  ollamaService (background, every 5s)            │
│    → finds detections with no AI recommendation  │
│    → sends angles + status to Ollama             │
│    → saves advice to ai_recommendations          │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│  FRONTEND (served from Express on :3000)         │
│                                                  │
│  Dashboard   → GET /api/posture/latest           │
│                GET /api/analytics/summary        │
│                GET /api/analytics/trends         │
│                                                  │
│  LiveCoach   → GET /api/posture/stream (SSE)     │
│                receives real-time detections     │
│                                                  │
│  Analytics   → GET /api/analytics/summary        │
│                GET /api/analytics/trends         │
│                                                  │
│  History     → GET /api/history                  │
│                search, filter, export CSV        │
└──────────────────────────────────────────────────┘
```

---

## 5. Installation & Setup

### Prerequisites

Before you start, you need to download and install:

| Software | Version | Download Link |
|----------|---------|---------------|
| **Node.js** | 18 or higher | https://nodejs.org/en/download |
| **Python** | **3.11.x exactly** | https://www.python.org/downloads/release/python-3119/ — scroll to "Windows installer (64-bit)" |
| **PostgreSQL** | 14 or higher | https://www.postgresql.org/download/ |
| **Docker Desktop** | Latest | https://www.docker.com/products/docker-desktop/ (optional — if you want Docker for PostgreSQL) |
| **Ollama** | Latest | https://ollama.com/download |
| **Git** | Latest | https://git-scm.com/downloads |

> ⚠️ **Python version is critical.** MediaPipe 0.10.14 only has wheels for Python 3.11. It will NOT work on Python 3.12 or 3.13. Install Python 3.11 even if you have another version installed — they can coexist.

**YouTube tutorials for the above if you need them:**
- Installing Node.js on Windows: https://www.youtube.com/watch?v=JINE4D0Syqw
- Installing Python on Windows: https://www.youtube.com/watch?v=YKSpANU8jcE
- Installing PostgreSQL on Windows: https://www.youtube.com/watch?v=0n41UTkOBb0
- Installing Docker Desktop: https://www.youtube.com/watch?v=WDEdRmTCSs8
- Installing Ollama and running a local model: https://www.youtube.com/watch?v=90ozfQ-bLqQ

---

### Step 1 — Clone or extract the project

```powershell
cd C:\Users\YourName
# Extract the project zip here
```

### Step 2 — Install Node.js dependencies

```powershell
cd Switch_Project
npm install
```

This installs everything in `package.json`: Express, JWT, pg, bcrypt, axios, dotenv, etc.

### Step 3 — Set up the database

**Option A — Docker (recommended, no PostgreSQL install needed):**

```powershell
docker compose up -d
```

**Option B — Local PostgreSQL:**

Open pgAdmin or psql and create a database called `posture_db`, then run:

```sql
\i src/database/init.sql
```

### Step 4 — Set up Python virtual environment for the camera

> This must use Python 3.11, not whatever `python` points to on your system.

```powershell
cd Switch_Project

# Create a venv using Python 3.11 specifically
py -3.11 -m venv venv311

# Activate it
.\venv311\Scripts\activate    # on Windows
# source venv311/bin/activate  # on Mac/Linux

# Install Python dependencies
py -3.11 -m pip install mediapipe==0.10.14 opencv-python fastapi uvicorn python-multipart requests
```

Verify MediaPipe works:
```powershell
py -3.11 -c "import mediapipe as mp; print(mp.solutions.pose.Pose)"
# Should print: <class 'mediapipe.python.solutions.pose.Pose'>
```

### Step 5 — Pull the Ollama model

```powershell
ollama pull llama3.2
```

### Step 6 — Set up your .env file

Copy `.env.example` to `.env` and fill in your values:

```powershell
copy .env.example .env
```

Then edit `.env` — the important fields are:
- `DB_PASSWORD` — your PostgreSQL password
- `JWT_SECRET` — any long random string
- `CAMERA_USER_ID` — a UUID from your users table (register first, then look up your user_id in the database)
- `CAMERA_SOURCE` — `0` for laptop webcam, or an IP stream URL

---

## 6. Running the Project

You need **4 terminals** running simultaneously.

**Terminal 1 — PostgreSQL (if not using Docker)**
```
# Already running as a Windows service if installed locally
# If using Docker: docker compose up -d (only needed once)
```

**Terminal 2 — Node backend**
```powershell
cd Switch_Project
npm start
# Server running on http://localhost:3000
```

**Terminal 3 — MediaPipe pose service**
```powershell
cd Switch_Project\src\camera
py -3.11 -m uvicorn pose_service:app --port 5001
# Uvicorn running on http://127.0.0.1:5001
```

**Terminal 4 — Camera sender**
```powershell
# First, register an account at http://localhost:3000/auth/SignIn.html
# Then find your user_id in the database and add it to .env as CAMERA_USER_ID

cd Switch_Project
py -3.11 src/camera/camera.py
# Camera source: 0
# Streaming to: http://localhost:3000/api/frame
```

Then open **http://localhost:3000** in your browser. Do not use Live Server or a different port — the cookies and SSE stream require same-origin requests.

---

## 7. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Express server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `posture_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | *(required)* |
| `JWT_SECRET` | JWT signing secret | *(required)* |
| `JWT_EXPIRES_IN` | JWT expiry | `1d` |
| `CAMERA_USER_ID` | UUID of the user the camera sends frames for | *(required)* |
| `CAMERA_SOURCE` | `0` = laptop webcam, `1` = USB webcam, or IP stream URL | `0` |
| `CAMERA_INTERVAL` | Seconds between frames | `2` |
| `BACKEND_URL` | Where camera.py posts frames | `http://localhost:3000/api/frame` |
| `POSE_SERVICE_URL` | Where Node sends images for pose detection | `http://localhost:5001/detect` |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `llama3.2` |
| `POLL_INTERVAL_MS` | How often Ollama polls for new detections 
| `PURGE_KEEP_FRAMES` | Max frames kept per user per session before purge | `500` |
| `GOOD_NECK_MIN` | Minimum neck angle for good posture 
| `GOOD_TRUNK_MAX` | Maximum trunk lean for good posture 
| `GOOD_HEAD_MAX_PX` | Maximum head offset in pixels for good posture 
| `PROLONGED_THRESHOLD` | Consecutive bad frames before prolonged_slouching 

---

## 8. The Robot Feature

**Yes, the robot feature exists in the code.** It is in `src/camera/main.py`.

It connects over WiFi to the robot's IP address (`192.168.4.1`) and sends JSON commands to control movement and LEDs.

### What it does

| Posture Detected | Robot Action | LED Colour |
|-----------------|--------------|-----------|
| Good posture | Stand upright | Green |
| Slouching | Slight backward lean | Yellow |
| Prolonged slouching | Stronger backward lean | Red |

### Current status

The robot script (`main.py`) is **not yet connected to the live backend**. It currently runs as a standalone test — you type a posture manually and it sends the command to the robot. The integration comments are already in the file:

```python
# AFTER INTEGRATION
# response = requests.get("http://server-ip/posture")
# data = response.json()
# process_posture(data)
```

### How to connect it to the backend

To fully connect the robot, `main.py` needs to poll the SSE stream or call `/api/posture/latest` every few seconds and pass the result to `process_posture()`. The `rules_table` already has a `robot_action` column that can store which command to send per rule.

### Running the robot test (standalone)

```powershell
py -3.11 src/camera/main.py
# Enter posture (not_slouching / slouching / prolonged_slouching / q):
```

The robot must be powered on and your PC must be connected to the robot's WiFi network.

---

## 9. Is It Scalable?

### What scales well

**Database** — PostgreSQL with a connection pool (`pg.Pool`) handles concurrent connections efficiently. The auto-purge function keeps `posture_detections` at a maximum of 500 frames per session, preventing unbounded growth regardless of how long a session runs.

**Backend** — Express is stateless. Adding a load balancer and running multiple Node processes (e.g. with PM2 cluster mode) would let it handle more users without any code changes.

**MediaPipe service** — FastAPI + Uvicorn with async handlers. Multiple workers (`--workers 4`) would allow concurrent pose detection requests.

**SSE** — Each connected client holds one open HTTP connection. This works fine for tens to hundreds of users. For thousands of concurrent live streams, you would migrate to WebSockets or a message broker (Redis pub/sub).

### What doesn't scale yet

**History pagination** — `HIstory.js` fetches up to 200 detections and filters client-side. This is fine for one user's personal history but would need server-side `WHERE` filtering and `LIMIT/OFFSET` pagination to handle large datasets efficiently.

**Single camera per user** — The system assumes one `CAMERA_USER_ID` per camera process. Multi-camera or multi-user concurrent sessions would require the camera sender to be aware of which user it's sending for, which it already supports via the `CAMERA_USER_ID` env variable.

**Ollama** — Running a local LLM on the same machine as the server is not scalable for multiple users. For production with many users, Ollama would need to run on a dedicated machine or be replaced with an API-based LLM.

**No Redis / message queue** — The SSE stream reads directly from the database. Under high load, moving to a Redis pub/sub model where new detections are pushed to subscribers would be more efficient.

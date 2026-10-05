# Posture Correction AI — User Manual

A simple, practical guide to running this project.

> This manual reflects the **actual code currently on `main`** (verified by running it).
> The project is a **Node.js + Express** app that serves the web UI and exposes a REST API,
> plus two Python services (a MediaPipe pose detector and a camera sender). PostgreSQL stores
> the data; Ollama (optional) generates AI coaching advice.

| Part | What it is | Port | How it runs |
|------|-----------|------|-------------|
| **Node/Express server** | REST API + serves the web UI | 3000 | `node src/app.js` |
| **PostgreSQL** | Database | 5432 | local install or Docker |
| **MediaPipe pose service** | Python/FastAPI, returns body angles | 5001 | `uvicorn pose_service:app` |
| **Camera sender** | Python, sends webcam frames to the server | — | `python src/camera/camera.py` |
| **Ollama** (optional) | Local LLM for advice | 11434 | `ollama serve` + `ENABLE_OLLAMA=true` |

---

3. **No database schema file on disk.** `Manual.md` references `src/database/init.sql`, but that
   file does not exist in the repo. You need the SQL that creates `users`, `posture_detections`,
   `rules_table`, and `ai_recommendations` before the app can store anything. Ask the team for
   `init.sql` (or recover it from the branch it was authored on).


## Part A — Everyday Commands (you already set everything up)

Run from the project root (the folder with `package.json`), unless noted otherwise.

### Start the web server
```bash
node src/app.js
```
Then open **http://localhost:3000** (it redirects to the Dashboard).
> `npm start` currently points at the old build and will **not** work until `package.json` is
> fixed. Use `node src/app.js` directly.

### Enable AI advice (optional)
```bash
ENABLE_OLLAMA=true node src/app.js      # macOS/Linux
# Windows PowerShell:
$env:ENABLE_OLLAMA="true"; node src/app.js
```
(Requires Ollama running and the model pulled — see below.)

### Start the MediaPipe pose service (needed for real posture detection)
```bash
cd src/camera
python -m uvicorn pose_service:app --port 5001
```

### Start the camera sender
```bash
python src/camera/camera.py
```
(Register a user first and set `CAMERA_USER_ID` in `.env` — see Part B, Step 6.)

### Database (Docker) — start / stop just Postgres
```bash
docker compose up -d postgres     # start ONLY the postgres service
docker compose stop postgres      # stop it
docker compose down               # stop + remove (add -v to also wipe data)
```
> Do **not** run a bare `docker compose up` — the stale `backend`/`frontend` services will fail.
> Name the `postgres` service explicitly as shown.

### Ollama (optional)
```bash
ollama serve            # start the Ollama server (if not already running)
ollama pull llama3.2    # one-time: download the model
ollama list             # see installed models
```

### Health checks
```bash
curl -i http://localhost:3000/Dashboard.html     # expect 200
curl http://localhost:3000/api/posture/latest    # expect 401 until you log in (auth works)
```

---

## Part B — Setting Up On a Brand-New Machine (from zero)

Apps are installed (Node, Python, PostgreSQL/Docker, Ollama, Git) but the project has never run here.

### Step 1 — Confirm your tools
```bash
node -v        # need v18+
python --version   # MediaPipe needs Python 3.11.x (NOT 3.12/3.13)
docker --version   # only if you'll run Postgres via Docker
git --version
```
> **Python version matters.** MediaPipe only ships wheels for Python 3.11. Install 3.11 even if
> you have a newer Python; they can coexist (`py -3.11` on Windows, `python3.11` on macOS/Linux).

### Step 2 — Get the code
```bash
git clone <repository-url>
cd Switch_Project
```

### Step 3 — Install Node dependencies
```bash
npm install
# package.json is incomplete (see "Read first"), so also install the real runtime deps:
npm install express cookie-parser jsonwebtoken bcrypt axios dotenv pg
```
> If/when `package.json` is corrected to list these and add `"type": "module"`, a plain
> `npm install` will be enough.

### Step 4 — Create the database
Start Postgres (pick one):
```bash
docker compose up -d postgres      # Docker option
# — or — use a locally installed PostgreSQL and create a DB named posture_db
```
Then load the schema. **You need `init.sql` from the team** (it's missing from the repo, see
"Read first" #3). Once you have it:
```bash
psql "postgresql://postgres:postgres@localhost:5432/posture_db" -f src/database/init.sql
```

### Step 5 — Set up the Python environment (camera + pose service)
```bash
# create a 3.11 virtual environment
python3.11 -m venv venv311          # Windows: py -3.11 -m venv venv311
source venv311/bin/activate         # Windows: .\venv311\Scripts\activate
pip install -r src/camera/requirements.txt
```
`requirements.txt` installs: fastapi, uvicorn, mediapipe==0.10.35, opencv-python,
python-multipart, numpy.

### Step 6 — Create your `.env`
```bash
cp .env.example .env     # Windows: copy .env.example .env
```
Then edit `.env`. The important fields:
- `DB_PASSWORD` — your Postgres password
- `JWT_SECRET` — any long random string (required for login)
- `CAMERA_USER_ID` — a user's UUID. Register an account first (Step 8), then copy your
  `user_id` from the `users` table into this field.
- `CAMERA_SOURCE` — `0` for a laptop webcam, or an IP-camera stream URL
- `BACKEND_URL` — where the camera posts frames; for local use set it to
  `http://localhost:3000/api/frame`

### Step 7 — (Optional) Pull the Ollama model
```bash
ollama pull llama3.2
```

### Step 8 — Run it (up to 3 terminals)
```bash
# Terminal 1 — web server
node src/app.js                         # add ENABLE_OLLAMA=true for AI advice

# Terminal 2 — pose service
cd src/camera && python -m uvicorn pose_service:app --port 5001

# Terminal 3 — camera sender (after registering + setting CAMERA_USER_ID)
python src/camera/camera.py
```
Open **http://localhost:3000**, register an account, then sign in. Use port 3000 directly —
cookies/auth require same-origin requests.

---

## Environment variables (from `.env.example`)

| Variable | Meaning | Example |
|----------|---------|---------|
| `PORT` | Express port | `3000` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL connection | localhost / 5432 / posture_db / postgres / … |
| `JWT_SECRET` | Signs login cookies (required) | *(random string)* |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | Ollama endpoint + model | `http://127.0.0.1:11434` / `llama3.2` |
| `ENABLE_OLLAMA` | Turns the advice poller on | `true` |
| `POSE_SERVICE_URL` | Where Node sends images for pose detection | `http://localhost:5001/detect` |
| `BACKEND_URL` | Where `camera.py` posts frames | `http://localhost:3000/api/frame` |
| `CAMERA_USER_ID` | UUID of the user the camera streams for | *(from users table)* |
| `CAMERA_SOURCE` / `CAMERA_INTERVAL` | Webcam index/URL + seconds between frames | `0` / `2` |
| `GOOD_NECK_MIN`, `GOOD_TRUNK_MAX`, `GOOD_HEAD_MAX_PX`, `PROLONGED_THRESHOLD` | Posture classification thresholds | 150 / 10 / 10 / 30 |
| `PURGE_KEEP_FRAMES` | Max frames kept before auto-purge | `500` |

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `npm start` fails | Use `node src/app.js`. `package.json` still points at the old build. |
| `Cannot find package 'express'` on a fresh clone | Run the extra `npm install …` in Part B, Step 3. |
| `MODULE_TYPELESS_PACKAGE_JSON` warning | Harmless. Add `"type": "module"` to `package.json` to silence it. |
| `docker compose up` errors on `backend`/`frontend` | Start only Postgres: `docker compose up -d postgres`. |
| App starts but nothing is stored / queries error | The DB schema isn't loaded — you need `init.sql` (see "Read first" #3). |
| Advice never generated | Set `ENABLE_OLLAMA=true` and make sure Ollama is running with the model pulled. |
| MediaPipe install fails | You're not on Python 3.11. Create the venv with 3.11 (Part B, Step 5). |
| 401 on `/api/...` | Expected until you log in — the API is JWT-protected. |

### Camera / Robot note
`src/camera/camera.py` (webcam sender) and `src/camera/pose_service.py` (MediaPipe) are present
and run as described above. The robot controller `main.py` referenced in `Manual.md` is **not**
in the repo yet.
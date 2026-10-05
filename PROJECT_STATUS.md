# Project Sanity Check & TODO

_A verified snapshot of the repo's current state and what's left to do._
_Checked by cloning, installing deps, and running the server against the latest `main`._

---

## 1. Good news — several earlier issues are already fixed on `main`

Since the setup manual (PR #6) was first written, `main` picked up fixes that resolve most of
the problems flagged there:

| Previously broken | Current state |
|-------------------|---------------|
| `package.json` was the old Go/TS stub, missing real deps | ✅ Fixed — now has `"type": "module"`, `express`, `bcrypt`, `jsonwebtoken`, `cookie-parser`, correct `start` script. `npm install` + `npm start` both work. |
| `docker-compose.yaml` referenced deleted `./backend/` + `nginx.conf` | ✅ Fixed — broken `backend`/`frontend` services are commented out; only `postgres` + `ollama` remain. |
| `src/database/init.sql` missing (no DB schema) | ✅ Added — creates `users`, `rules_table`, `posture_detections`, `ai_recommendations`. |
| `src/camera/main.py` (robot script) missing | ✅ Added. |
| `node_modules/` and `venv311/` committed into the repo (97 MB of bloat) | ✅ Removed from tracking. Tracked files dropped from ~8,363 to **43**. |

**Verified:** `npm install` → 364 packages, clean exit. `npm start` → `Server running on
http://localhost:3000`.

---

## 2. Size check

| Metric | Before | Now |
|--------|--------|-----|
| Project on disk | 128 MB | **31 MB** |
| What's left | `node_modules` 83M + `.git` 32M + `venv311` 14M | **`.git` 31M** (everything else regenerates via `npm install`) |
| Tracked files | 8,363 | 43 |

The working tree is now basically just `.git`. The only remaining size item is **git history**
(see TODO #1).

---

## 3. TODO — what's left to do

### 🔴 Must-fix (breaks a fresh setup)

1. **Add `JWT_SECRET` to `.env.example` and `.env`.**
   The server throws on startup if it's missing:
   ```
   Error: JWT_SECRET is not defined in .env
   ```
   Neither `.env.example` nor `.env` currently contains it, so anyone following the setup files
   will hit this immediately. Add a line, e.g.:
   ```
   JWT_SECRET=change-me-to-a-long-random-string
   ```

### 🟠 Recommended cleanup

2. **Reclaim git history size (optional, bigger hammer).**
   `node_modules`/`venv311` are no longer tracked, but their old blobs still sit in history,
   which is why `.git` is still ~31 MB. To actually shrink it:
   ```bash
   git filter-repo --path node_modules --path venv311 --invert-paths
   ```
   ⚠️ This **rewrites every commit hash** and needs a force-push — **everyone must re-clone**.
   For a project this size it's usually **not worth the disruption**; only do it if the 31 MB
   genuinely matters.

3. **Consolidate the two manuals.**
   The repo has `Manual.md` (design doc) and this PR adds `MANUAL.md` (verified setup guide).
   Decide whether to keep both or merge them to avoid confusion.

4. **Confirm `.env` should be committed at all.**
   `.env` is tracked and typically holds secrets. Consider adding it to `.gitignore` and keeping
   only `.env.example` in the repo. (`.gitignore` already covers `node_modules/`, `venv311/`,
   `__pycache__/`, `*.jpg`.)

### 🟡 Nice-to-have / verify later

5. **`Manual.md` details vs reality** — a couple of lines still drift from the code:
   - It cites `mediapipe==0.10.14`, but `src/camera/requirements.txt` pins `0.10.35`.
   - It references `src/database/init.sql` and `main.py`, which now exist (good) — re-read it
     end-to-end to make sure the rest matches.
6. **Confirm `init.sql` columns match the model queries.**
   The schema was added recently; do a pass to confirm the columns in `src/models/*.js`
   (e.g. `postureModel.js`, `rulesModel.js`) line up with the tables in `init.sql` before
   relying on live data.
7. **Ollama poller is opt-in** — advice generation only runs with `ENABLE_OLLAMA=true`.
   Document this in the main setup instructions so it isn't a surprise.

---

## 4. How this was verified

```bash
npm install          # 364 packages, exit 0
JWT_SECRET=test npm start   # -> "Server running on http://localhost:3000"
npm start            # (without JWT_SECRET) -> fails with the error above
git ls-files | wc -l # 43 tracked files
du -sh .             # 31M
```

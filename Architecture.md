# System Architecture: Posture Correction AI Module

## 1. High-Level Overview
+-------------------+ +-------------------+ +-------------------+
| | | | | |
| 📸 Camera | --> | 🦴 MediaPipe | --> | ⚙️ Server |
| (User's desk) | | (Extracts pose) | | (Writes frames) |
| | | | | |
+-------------------+ +-------------------+ +-------------------+
|
v
+-------------------+
| 🗄️ PostgreSQL |
| |
| posture_detections|
| rules_table |
+-------------------+
|
v
+-------------------------------------------------------+-----------------------+
| |
| YOUR MODULE (LLM Orchestration) |
| |
| +-----------------------------------------------------------------------+ |
| | SETUP (Runs Once) | |
| | • Load full SOP from rules_table into Ollama cache | |
| +-----------------------------------------------------------------------+ |
| |
| +-----------------------------------------------------------------------+ |
| | POLL LOOP (Every 5 Seconds) | |
| | | |
| | Step 1: READ PostgreSQL → 5 most recent frames | |
| | Step 2: AVERAGE → Calculate mean angles | |
| | Step 3: READ PostgreSQL → SOP rules & RAG chunks | |
| | Step 4: REFLECT → Agent A (Generator) → Agent B (Reflector) | |
| | Step 5: WRITE PostgreSQL → advice + confidence_score | |
| +-----------------------------------------------------------------------+ |
| |
+-------------------------------------------------------+-----------------------+
|
v
+-------------------+
| 🗄️ PostgreSQL |
| (advice stored) |
+-------------------+
|
v
+-------------------+
| 📱 Web UI |
| (Displays advice)|
+-------------------+

text

---

## 2. Design Methodology

### 2.1 Reflection Pattern (Generator → Reflector)

The module uses a two-step **Reflection** pattern where:

| Step | Agent | Role |
|------|-------|------|
| 1 | **Agent A (Generator)** | Writes a draft 3-step solution based on the posture data and SOP rules. |
| 2 | **Agent B (Reflector)** | Reviews the draft, critiques it for safety/practicality, and outputs an improved final version. |

### 2.2 Key Benefits of Reflection Pattern
- **Quality Control**: Agent B acts as a built-in reviewer, catching errors or unsafe suggestions.
- **Iterative Improvement**: The solution is refined before reaching the user.
- **Safety**: The reflection step ensures SOP compliance and reduces hallucinations.

---

## 3. Design Patterns

| Pattern | Applied To | Why |
|---------|------------|-----|
| **Polling Consumer** | PostgreSQL polling | The module polls the database at a fixed interval (5 seconds) to check for new data. |
| **Generator-Reflector** | LLM pipeline | Two-step reflection improves output quality and safety. |
| **Singleton** | Cache management | The SOP cache is initialized once and reused for all requests. |
| **Fallback** | Error handling | If the LLM fails, a hardcoded safe routine is used. |

---

## 4. Data Flow
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATA FLOW DIAGRAM │
├─────────────────────────────────────────────────────────────────────────────┤
│ │
│ [MediaPipe] → [posture_detections table] → [YOUR MODULE] │
│ │ │
│ v │
│ [rules_table] → [YOUR MODULE] ← [RAG Chunks] │
│ │ │
│ v │
│ [YOUR MODULE] → [posture_detections table] → [Web UI] │
│ │
└─────────────────────────────────────────────────────────────────────────────┘

text

### 4.1 Detailed Data Flow

| Step | Source | Destination | Data |
|------|--------|-------------|------|
| 1 | MediaPipe | PostgreSQL | `neck_angle`, `back_angle`, `head_forward_distance` |
| 2 | PostgreSQL | Your Module | 5 most recent frames |
| 3 | Your Module | (Memory) | Averaged angles |
| 4 | PostgreSQL | Your Module | SOP rules + RAG chunks |
| 5 | Your Module | Ollama | System prompt + user prompt |
| 6 | Ollama | Your Module | JSON response |
| 7 | Your Module | PostgreSQL | `advice` + `confidence_score` |
| 8 | PostgreSQL | Web UI | Display advice to user |

---

## 5. Component Architecture

### 5.1 Your Module Components
┌─────────────────────────────────────────────────────────────────────────┐
│ POSTURE AGENT MODULE │
├─────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ PostureAgent Class │ │
│ │ │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ Constructor │ │ │
│ │ │ • Accept: model, baseUrl │ │ │
│ │ │ • Load SOP into cache (once) │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ │ │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ generate() │ │ │
│ │ │ • Accept: postureJson, ragChunks │ │ │
│ │ │ • Call Agent A (Generator) │ │ │
│ │ │ • Call Agent B (Reflector) │ │ │
│ │ │ • Return: { steps, reasoning } │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ │ │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ pollLoop() │ │ │
│ │ │ • Run every 5 seconds │ │ │
│ │ │ • Query PostgreSQL for last 5 frames │ │ │
│ │ │ • Average the 5 frames │ │ │
│ │ │ • Call generate() │ │ │
│ │ │ • Write result back to PostgreSQL │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ │ │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ callOllama() │ │ │
│ │ │ • POST to /api/chat │ │ │
│ │ │ • Format: JSON │ │ │
│ │ │ • Retry up to 2 times │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ │ │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ fallback() │ │ │
│ │ │ • Return hardcoded safe routine │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────────────┘

text

---

## 6. Key Implementation Details

### 6.1 Prompt Caching Strategy

| Aspect | Implementation |
|--------|----------------|
| **System Prompt** | Exactly identical across both Agent A and Agent B calls. |
| **Cache Placement** | The `system` message is the FIRST message in the array. |
| **Dynamic Data** | All dynamic data (posture, RAG chunks) goes ONLY in the `user` message. |
| **Result** | Ollama automatically caches the system prompt for ~5-10 minutes, reducing latency and cost. |

### 6.2 Polling Logic

```typescript
while (true) {
  // 1. Read 5 most recent frames
  const frames = await db.query(`
    SELECT neck_angle, back_angle, head_forward_distance
    FROM posture_detections
    ORDER BY detected_at DESC
    LIMIT 5
  `);

  // 2. Average the frames
  const averaged = {
    neck_angle: average(frames.map(f => f.neck_angle)),
    back_angle: average(frames.map(f => f.back_angle)),
    head_forward_distance: average(frames.map(f => f.head_forward_distance))
  };

  // 3. Query SOP rules
  const sopRules = await db.query(`
    SELECT rule_name, min_angle, max_angle, result, recommendation
    FROM rules_table
  `);

  // 4. Run Reflection pipeline
  const result = await generate(averaged, sopRules);

  // 5. Write advice back
  await db.query(`
    UPDATE posture_detections
    SET advice = $1, confidence_score = $2
    WHERE id = (SELECT id FROM posture_detections ORDER BY detected_at DESC LIMIT 1)
  `, [result.advice, result.confidence]);

  // 6. Wait 5 seconds
  await sleep(5000);
}
6.3 Ollama Integration
Parameter	Value
Endpoint	POST /api/chat
Model	Configurable via .env (default: llama3.2)
Format	json
Stream	false
Temperature	0.0 (deterministic)
6.4 Fallback Strategy
Scenario	Action
Ollama timeout	Retry up to 2 times
Invalid JSON response	Retry up to 2 times
API error (500, 503, etc.)	Retry up to 2 times
All retries fail	Return hardcoded safe routine
Network error	Return hardcoded safe routine
7. Testing Strategy
7.1 Unit Tests
Frame averaging logic

JSON parsing

Fallback logic

7.2 Integration Tests
PostgreSQL connection

Ollama API calls

End-to-end poll loop

7.3 Mock Data
Pre-defined posture JSONs

Mock SOP rules

Mock Ollama responses

7.4 Performance Tests
Latency under load (multiple users)

Database connection pooling

Ollama response time

8. Deployment Considerations
8.1 Environment Variables
env
DATABASE_URL=postgresql://user:pass@localhost:5432/posture_db
OLLAMA_MODEL=llama3.2
OLLAMA_BASE_URL=http://localhost:11434
POLL_INTERVAL=5000
8.2 Resource Requirements
Resource	Minimum
RAM	16 GB
CPU	4 cores
GPU	Optional (recommended for Ollama)
Storage	10 GB
9. Monitoring & Logging
What to Log	Why
Successful poll events	Track system health
LLM response times	Monitor performance
Failed retries	Debug issues
Fallback triggers	Alert for system failures
Written advice	Track user sentiment
10. Future Enhancements
Feature	Description
Real-time WebSocket	Push advice instantly instead of polling
User-specific SOP	Personalize rules per user
Historical analysis	Track posture trends over time
Multi-language support	Advice in user's preferred language
text

---
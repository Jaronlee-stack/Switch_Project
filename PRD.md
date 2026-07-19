# PRD: Posture Correction AI Module

## 1. Product Overview

### 1.1 Purpose
The Posture Correction AI Module is an LLM-powered orchestration system that provides personalized, real-time corrective advice to users based on their live posture data.

### 1.2 Target Users
- Office workers who sit for extended periods
- Individuals with posture-related discomfort
- Health-conscious professionals

### 1.3 Core Value Proposition
Delivers **AI-generated, personalized posture advice** within 5 seconds of detecting sustained poor posture, helping users correct their habits in real-time.

---

## 2. Functional Requirements

### 2.1 Data Ingestion
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | The module must poll PostgreSQL every 5 seconds for the 5 most recent posture frames. | High |
| FR-02 | The module must average the 5 frames to create a single posture snapshot. | High |
| FR-03 | The module must read SOP rules from the `rules_table`. | High |

### 2.2 LLM Orchestration
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-04 | The module must pre-load the full SOP into Ollama's cache at startup. | High |
| FR-05 | The module must run a **Generator → Reflector** (Reflection) pipeline. | High |
| FR-06 | Agent A (Generator) must produce a draft 3-step corrective solution. | High |
| FR-07 | Agent B (Reflector) must review, critique, and improve the draft solution. | High |

### 2.3 Output Generation
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-08 | The module must generate personalized `advice` text for the user. | High |
| FR-09 | The module must generate a `confidence_score` (0-100). | High |
| FR-10 | The module must write `advice` and `confidence_score` back to PostgreSQL. | High |

### 2.4 Error Handling
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-11 | If Ollama fails, retry up to 2 times. | High |
| FR-12 | If all retries fail, return a hardcoded safe fallback. | High |
| FR-13 | The module must log all failures for debugging. | Medium |

---

## 3. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Polling interval | Every 5 seconds |
| NFR-02 | Maximum end-to-end latency | < 3 seconds (from poll to write) |
| NFR-03 | LLM response time | < 2 seconds per Ollama call |
| NFR-04 | Availability | 99.5% uptime |
| NFR-05 | Language | TypeScript (Node.js) |
| NFR-06 | AI Model | Ollama (Llama 3.2 or equivalent) |

---

## 4. Success Metrics

| Metric | Target |
|--------|--------|
| Advice generation success rate | > 95% |
| Average confidence score | > 80% |
| User posture improvement rate | > 30% over 4 weeks |
| System uptime | > 99.5% |

---

## 5. Assumptions & Constraints

### Assumptions
- PostgreSQL is available and populated with live posture frames.
- Ollama is running and accessible at `http://localhost:11434`.
- The SOP rules table is maintained by the server team.
- MediaPipe provides accurate joint angles.

### Constraints
- No external API calls (all LLM work is local via Ollama).
- The module does NOT handle camera, UI, or push notifications.
- The module does NOT determine if posture is Good/Warning/Bad (handled by the server team).

---

## 6. Deliverables

| File | Description |
|------|-------------|
| `src/types/index.ts` | TypeScript interfaces |
| `src/agent/PostureAgent.ts` | Main LLM orchestrator class |
| `src/index.ts` | Entry point with polling loop |
| `package.json` | Dependencies |
| `.env.example` | Environment variables |
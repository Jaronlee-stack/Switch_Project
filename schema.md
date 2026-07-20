## SCHEMAS.md (Database Schemas)

```markdown
# Database Schemas: Posture Correction System

## 1. Entity Relationship Diagram (ERD)
┌─────────────────────────────────────────────────────────────────────────────┐
│ ERD DIAGRAM │
├─────────────────────────────────────────────────────────────────────────────┤
│ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ users │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ user_id (PK) UUID │ │ │
│ │ │ username VARCHAR │ │ │
│ │ │ email VARCHAR │ │ │
│ │ │ created_at TIMESTAMP │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ │ │
│ │ 1:M │
│ ▼ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ posture_detections │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ detection_id (PK) SERIAL │ │ │
│ │ │ user_id (FK) UUID │ │ │
│ │ │ session_id VARCHAR │ │ │
│ │ │ detected_at TIMESTAMP │ │ │
│ │ │ neck_angle DECIMAL(5,2) │ │ │
│ │ │ back_angle DECIMAL(5,2) │ │ │
│ │ │ head_forward_distance DECIMAL(5,2) │ │ │
│ │ │ posture_result VARCHAR(10) │ │ │
│ │ │ confidence_score DECIMAL(5,2) │ │ │
│ │ │ advice TEXT │ │ │
│ │ │ image_path VARCHAR(255) │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ │ │
│ │ M:1 │
│ ▼ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ rules_table │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ rule_id (PK) SERIAL │ │ │
│ │ │ rule_name VARCHAR(50) │ │ │
│ │ │ min_angle DECIMAL(5,2) │ │ │
│ │ │ max_angle DECIMAL(5,2) │ │ │
│ │ │ result VARCHAR(10) │ │ │
│ │ │ recommendation TEXT │ │ │
│ │ │ robot_action VARCHAR(50) │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ daily_summaries │ │
│ │ ┌──────────────────────────────────────────────────────────┐ │ │
│ │ │ summary_id (PK) SERIAL │ │ │
│ │ │ user_id (FK) UUID │ │ │
│ │ │ summary_date DATE │ │ │
│ │ │ total_detections INTEGER │ │ │
│ │ │ good_count INTEGER │ │ │
│ │ │ warning_count INTEGER │ │ │
│ │ │ bad_count INTEGER │ │ │
│ │ │ average_neck_angle DECIMAL(5,2) │ │ │
│ │ │ average_back_angle DECIMAL(5,2) │ │ │
│ │ │ longest_good_posture_minutes INTEGER │ │ │
│ │ └──────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ │
└─────────────────────────────────────────────────────────────────────────────┘

text

---

## 2. Table Schemas

### 2.1 `posture_detections`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `detection_id` | `SERIAL` | **NOT NULL** | `nextval()` | Primary key |
| `user_id` | `UUID` | **NOT NULL** | - | References `users.user_id` |
| `session_id` | `VARCHAR(100)` | **NOT NULL** | - | Session identifier |
| `detected_at` | `TIMESTAMP` | **NOT NULL** | `NOW()` | Time of detection |
| `neck_angle` | `DECIMAL(5,2)` | **NOT NULL** | - | Neck flexion angle (degrees) |
| `back_angle` | `DECIMAL(5,2)` | **NOT NULL** | - | Back angle (degrees) |
| `head_forward_distance` | `DECIMAL(5,2)` | **NOT NULL** | - | Forward head posture (cm) |
| `posture_result` | `VARCHAR(10)` | **NOT NULL** | - | 'Good' \| 'Warning' \| 'Bad' |
| `confidence_score` | `DECIMAL(5,2)` | **NULL** | `NULL` | LLM confidence (0-100) |
| `advice` | `TEXT` | **NULL** | `NULL` | LLM-generated advice |
| `image_path` | `VARCHAR(255)` | **NULL** | `NULL` | Optional saved frame |

**Indexes:**
```sql
CREATE INDEX idx_posture_detections_user_id ON posture_detections(user_id);
CREATE INDEX idx_posture_detections_detected_at ON posture_detections(detected_at DESC);
CREATE INDEX idx_posture_detections_session_id ON posture_detections(session_id);
2.2 rules_table
Column	Type	Nullable	Default	Description
rule_id	SERIAL	NOT NULL	nextval()	Primary key
rule_name	VARCHAR(50)	NOT NULL	-	e.g., 'Good Sitting', 'Warning'
min_angle	DECIMAL(5,2)	NOT NULL	-	Minimum angle for this rule
max_angle	DECIMAL(5,2)	NOT NULL	-	Maximum angle for this rule
result	VARCHAR(10)	NOT NULL	-	'Good' | 'Warning' | 'Bad'
recommendation	TEXT	NOT NULL	-	Default advice for this rule
robot_action	VARCHAR(50)	NULL	NULL	Optional robot action
Data Example:

sql
INSERT INTO rules_table (rule_name, min_angle, max_angle, result, recommendation, robot_action) VALUES
('Good Sitting', 80, 100, 'Good', 'Maintain this posture', 'LED Green'),
('Warning', 60, 79, 'Warning', 'Sit up straighter', 'LED Yellow'),
('Bad', 0, 59, 'Bad', 'Stand up and stretch', 'LED Red + Lean Forward');
2.3 daily_summaries
Column	Type	Nullable	Default	Description
summary_id	SERIAL	NOT NULL	nextval()	Primary key
user_id	UUID	NOT NULL	-	References users.user_id
summary_date	DATE	NOT NULL	-	Date of summary
total_detections	INTEGER	NOT NULL	0	Total checks
good_count	INTEGER	NOT NULL	0	Count of 'Good'
warning_count	INTEGER	NOT NULL	0	Count of 'Warning'
bad_count	INTEGER	NOT NULL	0	Count of 'Bad'
average_neck_angle	DECIMAL(5,2)	NOT NULL	0	Avg neck angle
average_back_angle	DECIMAL(5,2)	NOT NULL	0	Avg back angle
longest_good_posture_minutes	INTEGER	NOT NULL	0	Longest good stretch
3. RLS (Row Level Security) Policies
3.1 posture_detections RLS
sql
-- Enable RLS
ALTER TABLE posture_detections ENABLE ROW LEVEL SECURITY;

-- Users can only read their own detections
CREATE POLICY policy_posture_detections_select
  ON posture_detections
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own detections
CREATE POLICY policy_posture_detections_insert
  ON posture_detections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own detections (advice column only)
CREATE POLICY policy_posture_detections_update
  ON posture_detections
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      advice IS NOT NULL
      OR confidence_score IS NOT NULL
    )
  );
3.2 daily_summaries RLS
sql
-- Enable RLS
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only read their own summaries
CREATE POLICY policy_daily_summaries_select
  ON daily_summaries
  FOR SELECT
  USING (user_id = auth.uid());

-- Only the system can insert summaries
CREATE POLICY policy_daily_summaries_insert
  ON daily_summaries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
4. Migrations
4.1 Migration 1: Create Core Tables
sql
-- Migration 1: Create core tables
BEGIN;

-- Users table
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Rules table
CREATE TABLE rules_table (
  rule_id SERIAL PRIMARY KEY,
  rule_name VARCHAR(50) NOT NULL,
  min_angle DECIMAL(5,2) NOT NULL,
  max_angle DECIMAL(5,2) NOT NULL,
  result VARCHAR(10) NOT NULL,
  recommendation TEXT NOT NULL,
  robot_action VARCHAR(50)
);

-- Posture detections table
CREATE TABLE posture_detections (
  detection_id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  detected_at TIMESTAMP DEFAULT NOW(),
  neck_angle DECIMAL(5,2) NOT NULL,
  back_angle DECIMAL(5,2) NOT NULL,
  head_forward_distance DECIMAL(5,2) NOT NULL,
  posture_result VARCHAR(10) NOT NULL,
  confidence_score DECIMAL(5,2),
  advice TEXT,
  image_path VARCHAR(255)
);

-- Daily summaries table
CREATE TABLE daily_summaries (
  summary_id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_detections INTEGER DEFAULT 0,
  good_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  bad_count INTEGER DEFAULT 0,
  average_neck_angle DECIMAL(5,2) DEFAULT 0,
  average_back_angle DECIMAL(5,2) DEFAULT 0,
  longest_good_posture_minutes INTEGER DEFAULT 0,
  UNIQUE(user_id, summary_date)
);

COMMIT;
4.2 Migration 2: Create Indexes
sql
-- Migration 2: Create indexes for performance
BEGIN;

CREATE INDEX idx_posture_detections_user_id ON posture_detections(user_id);
CREATE INDEX idx_posture_detections_detected_at ON posture_detections(detected_at DESC);
CREATE INDEX idx_posture_detections_session_id ON posture_detections(session_id);
CREATE INDEX idx_posture_detections_posture_result ON posture_detections(posture_result);
CREATE INDEX idx_daily_summaries_user_id_date ON daily_summaries(user_id, summary_date);

COMMIT;
4.3 Migration 3: Insert Default Rules
sql
-- Migration 3: Insert default rules
BEGIN;

INSERT INTO rules_table (rule_name, min_angle, max_angle, result, recommendation, robot_action) VALUES
('Good Sitting', 80, 100, 'Good', 'You are sitting with good posture. Maintain this position.', 'LED Green'),
('Warning', 60, 79, 'Warning', 'Your posture is starting to slouch. Sit up straighter and adjust your chair.', 'LED Yellow'),
('Bad', 0, 59, 'Bad', 'Your posture needs immediate correction. Stand up, stretch, and reset your seating.', 'LED Red + Lean Forward');

COMMIT;
4.4 Migration 4: Add RLS Policies
sql
-- Migration 4: Enable Row Level Security
BEGIN;

ALTER TABLE posture_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Posture detections policies
CREATE POLICY policy_posture_detections_select
  ON posture_detections
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY policy_posture_detections_insert
  ON posture_detections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY policy_posture_detections_update
  ON posture_detections
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      advice IS NOT NULL
      OR confidence_score IS NOT NULL
    )
  );

-- Daily summaries policies
CREATE POLICY policy_daily_summaries_select
  ON daily_summaries
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY policy_daily_summaries_insert
  ON daily_summaries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMIT;
4.5 Migration 5: Add Full-Text Search for SOP
sql
-- Migration 5: Add full-text search for SOP rules
BEGIN;

ALTER TABLE rules_table ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', rule_name || ' ' || recommendation)) STORED;

CREATE INDEX idx_rules_table_search ON rules_table USING GIN(search_vector);

COMMIT;
5. Views
5.1 User Summary View
sql
CREATE VIEW user_posture_summary AS
SELECT
  user_id,
  DATE(detected_at) as date,
  COUNT(*) as total_detections,
  SUM(CASE WHEN posture_result = 'Good' THEN 1 ELSE 0 END) as good_count,
  SUM(CASE WHEN posture_result = 'Warning' THEN 1 ELSE 0 END) as warning_count,
  SUM(CASE WHEN posture_result = 'Bad' THEN 1 ELSE 0 END) as bad_count,
  AVG(neck_angle) as avg_neck_angle,
  AVG(back_angle) as avg_back_angle
FROM posture_detections
GROUP BY user_id, DATE(detected_at);
5.2 Real-time Status View
sql
CREATE VIEW realtime_posture AS
SELECT DISTINCT ON (user_id)
  user_id,
  detected_at,
  posture_result,
  advice,
  confidence_score
FROM posture_detections
ORDER BY user_id, detected_at DESC;
6. Query Examples
6.1 Fetch Latest Frames for LLM
sql
SELECT neck_angle, back_angle, head_forward_distance
FROM posture_detections
WHERE user_id = 'abc-123'
ORDER BY detected_at DESC
LIMIT 5;
6.2 Fetch SOP Rules
sql
SELECT rule_name, min_angle, max_angle, result, recommendation
FROM rules_table
ORDER BY rule_id;
6.3 Update Advice in Latest Detection
sql
UPDATE posture_detections
SET advice = 'Tuck your chin and raise your monitor.',
    confidence_score = 92.5
WHERE detection_id = (
  SELECT detection_id
  FROM posture_detections
  WHERE user_id = 'abc-123'
  ORDER BY detected_at DESC
  LIMIT 1
);
7. Data Dictionary
Term	Definition
Neck Angle	Angle between the neck and vertical axis. Lower values indicate forward head posture.
Back Angle	Angle between the back and vertical axis. Lower values indicate slouching.
Head Forward Distance	Horizontal distance from head to shoulder line in cm.
Posture Result	Categorization based on simple thresholds: Good, Warning, Bad.
Confidence Score	AI-generated confidence (0-100%) in the advice provided.
Advice	Personalized corrective feedback generated by the LLM.
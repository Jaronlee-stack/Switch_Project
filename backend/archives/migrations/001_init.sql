CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ============================
-- Users
-- ============================
CREATE TABLE users (
    user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superuser')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================
-- Rules
-- ============================
CREATE TABLE rules_table (
    rule_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name            TEXT NOT NULL,
    description          TEXT NOT NULL,
    recommendation_text  TEXT NOT NULL,
    robot_action         TEXT,
    active               BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================
-- Posture Detections
-- ============================
CREATE TABLE posture_detections (
    detection_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frame_id         BIGINT NOT NULL,
    user_id          UUID NOT NULL REFERENCES users(user_id),
    session_id       UUID NOT NULL,
    detected_at      TIMESTAMPTZ NOT NULL,
    posture_status   TEXT NOT NULL,
    posture_score    NUMERIC NOT NULL,
    issue            TEXT,
    neck_angle       NUMERIC NOT NULL,
    trunk_lean       NUMERIC NOT NULL,
    head_offset_px   NUMERIC NOT NULL,
    view             TEXT NOT NULL DEFAULT 'side',
    matched_rule_id  UUID REFERENCES rules_table(rule_id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posture_detections_user_id ON posture_detections(user_id);
CREATE INDEX idx_posture_detections_session_id ON posture_detections(session_id);

-- ============================
-- AI Recommendations
-- ============================
CREATE TABLE ai_recommendations (
    recommendation_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detection_id        UUID NOT NULL REFERENCES posture_detections(detection_id),
    recommendation_text TEXT NOT NULL,
    confidence           NUMERIC,
    model_used            TEXT,
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_recommendations_detection_id ON ai_recommendations(detection_id);

COMMIT;

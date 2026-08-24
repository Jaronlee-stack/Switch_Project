CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ===========================
-- Users
-- ===========================

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- SOP Rules
-- ===========================

CREATE TABLE IF NOT EXISTS rules_table (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(50) NOT NULL,
    min_angle DECIMAL(5,2) NOT NULL,
    max_angle DECIMAL(5,2) NOT NULL,
    result VARCHAR(20) NOT NULL,
    recommendation TEXT NOT NULL,
    robot_action VARCHAR(100)
);

-- ===========================
-- Posture Detections
-- ===========================

CREATE TABLE IF NOT EXISTS posture_detections (
    detection_id SERIAL PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    session_id VARCHAR(100) NOT NULL DEFAULT 'default-session',

    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),

    neck_angle DECIMAL(5,2) NOT NULL,

    back_angle DECIMAL(5,2) NOT NULL,

    head_forward_distance DECIMAL(5,2) NOT NULL,

    posture_result VARCHAR(20) NOT NULL,

    confidence_score DECIMAL(5,2),

    advice TEXT,

    image_path VARCHAR(255)
);

-- ===========================
-- Daily Summary
-- ===========================

CREATE TABLE IF NOT EXISTS daily_summaries (
    summary_id SERIAL PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,

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

-- ===========================
-- Indexes
-- ===========================

CREATE INDEX IF NOT EXISTS idx_posture_detected
ON posture_detections(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_posture_user
ON posture_detections(user_id);

-- ===========================
-- Seed User
-- ===========================

INSERT INTO users (
    user_id,
    username,
    email
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'default',
    'default@posture.local'
)
ON CONFLICT (user_id) DO NOTHING;

-- ===========================
-- Seed SOP Rules
-- ===========================

INSERT INTO rules_table (
    rule_name,
    min_angle,
    max_angle,
    result,
    recommendation,
    robot_action
)
VALUES
(
    'Good Sitting',
    80,
    100,
    'Good',
    'Maintain your current posture.',
    'LED Green'
),
(
    'Warning',
    60,
    79,
    'Warning',
    'Sit up straighter and relax your shoulders.',
    'LED Yellow'
),
(
    'Bad',
    0,
    59,
    'Bad',
    'Stand up, stretch, then reset your sitting posture.',
    'LED Red'
)
ON CONFLICT DO NOTHING;

COMMIT;
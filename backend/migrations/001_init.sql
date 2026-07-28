CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rules_table (
    rule_id SERIAL PRIMARY KEY,
    rule_name VARCHAR(50) NOT NULL,
    min_angle DECIMAL(5,2) NOT NULL,
    max_angle DECIMAL(5,2) NOT NULL,
    result VARCHAR(10) NOT NULL,
    recommendation TEXT NOT NULL,
    robot_action VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS posture_detections (
    detection_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL DEFAULT 'default-session',
    detected_at TIMESTAMP DEFAULT NOW(),
    neck_angle DECIMAL(5,2) NOT NULL,
    back_angle DECIMAL(5,2) NOT NULL,
    head_forward_distance DECIMAL(5,2) NOT NULL,
    posture_result VARCHAR(10) NOT NULL,
    confidence_score DECIMAL(5,2),
    advice TEXT,
    image_path VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS daily_summaries (
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

CREATE INDEX IF NOT EXISTS idx_posture_detections_detected_at ON posture_detections(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_posture_detections_user_id ON posture_detections(user_id);

-- Default user for unauthenticated frames
INSERT INTO users (user_id, username, email) VALUES
('550e8400-e29b-41d4-a716-446655440000'::uuid, 'default', 'default@posture.local')
ON CONFLICT (user_id) DO NOTHING;

-- Default SOP rules
INSERT INTO rules_table (rule_name, min_angle, max_angle, result, recommendation, robot_action) VALUES
('Good Sitting', 80, 100, 'Good', 'You are sitting with good posture. Maintain this position.', 'LED Green'),
('Warning', 60, 79, 'Warning', 'Your posture is starting to slouch. Sit up straighter and adjust your chair.', 'LED Yellow'),
('Bad', 0, 59, 'Bad', 'Your posture needs immediate correction. Stand up, stretch, and reset your seating.', 'LED Red + Lean Forward')
ON CONFLICT DO NOTHING;

COMMIT;

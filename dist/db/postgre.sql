-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    email         VARCHAR(100) PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Habit History Table
CREATE TABLE IF NOT EXISTS public.habit_history (
    history_id         SERIAL PRIMARY KEY,
    total_detections   INTEGER,
    good_count         INTEGER,
    warning_count      INTEGER,
    bad_count          INTEGER,
    most_common_result VARCHAR(20)
);

-- 3. Posture Sessions Table
CREATE TABLE IF NOT EXISTS public.posture_sessions (
    session_id     SERIAL PRIMARY KEY,	
    age            INTEGER,
    height_cm      INTEGER,
    frame_id       INTEGER,
    detected_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    posture        VARCHAR(25),
    issues         TEXT,
    neck_angle     DOUBLE PRECISION,
    back_angle     DOUBLE PRECISION,
    trunk_lean     DOUBLE PRECISION,
    head_offset_px INTEGER,
    view           VARCHAR(10),
    ai_advice      TEXT,
    ai_verdict     VARCHAR(30),
    robot_action   VARCHAR(100)
);

-- 4. SOP (Standard Operating Procedure) Rules Table
CREATE TABLE IF NOT EXISTS public.sop (
    sop_id       SERIAL PRIMARY KEY,
    rule_name    VARCHAR(100),
    metric       VARCHAR(50),
    threshold    DOUBLE PRECISION,
    result_label VARCHAR(30),
    advice       TEXT,
    robot_action VARCHAR(100)
);
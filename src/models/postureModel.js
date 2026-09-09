import pool from "../../dbConfig.js";

/**
 * How many frames to KEEP per user. When a user's frame count
 * crosses this threshold the oldest frames are purged.
 * "After every 500 frames, auto purge" -> keeps the newest 500.
 */
const PURGE_KEEP_FRAMES = Number(process.env.PURGE_KEEP_FRAMES || 500);

/**
 * Insert one detection. Runs inside a transaction together with
 * the purge check so a failed insert never purges and a purge
 * failure rolls back the insert.
 */
export async function saveDetection({
    frame_id,
    user_id,
    session_id,
    detected_at,
    posture_status,
    posture_score,
    issue,
    neck_angle,
    trunk_lean,
    head_offset_px,
    view = "side",
    matched_rule_id = null
}) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const result = await client.query(
            `
            INSERT INTO posture_detections (
                frame_id, user_id, session_id, detected_at,
                posture_status, posture_score, issue,
                neck_angle, trunk_lean, head_offset_px,
                view, matched_rule_id
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING *
            `,
            [
                frame_id, user_id, session_id, detected_at,
                posture_status, posture_score, issue,
                neck_angle, trunk_lean, head_offset_px,
                view, matched_rule_id
            ]
        );

        const purgedCount = await purgeOldFrames(client, user_id);

        await client.query("COMMIT");
        return { detection: result.rows[0], purged: purgedCount };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/**
 * AUTO-PURGE: after a user's frame count exceeds PURGE_KEEP_FRAMES,
 * delete everything older than the newest N frames.
 *
 * ai_recommendations must be deleted first because it has a FK to
 * posture_detections (or add ON DELETE CASCADE — see init.sql note).
 */
export async function purgeOldFrames(client, userId) {
    const { rows } = await client.query(
        `SELECT COUNT(*)::int AS count FROM posture_detections WHERE user_id = $1`,
        [userId]
    );

    const count = rows[0].count;
    if (count <= PURGE_KEEP_FRAMES) return 0;

    // delete orphaned recommendations belonging to frames about to be purged
    const recRes = await client.query(
        `
        DELETE FROM ai_recommendations
        WHERE detection_id IN (
            SELECT detection_id FROM posture_detections
            WHERE user_id = $1
            ORDER BY detected_at DESC
            OFFSET $2
        )
        `,
        [userId, PURGE_KEEP_FRAMES]
    );

    const detRes = await client.query(
        `
        DELETE FROM posture_detections
        WHERE user_id = $1
          AND detection_id NOT IN (
              SELECT detection_id FROM posture_detections
              WHERE user_id = $1
              ORDER BY detected_at DESC
              LIMIT $2
          )
        `,
        [userId, PURGE_KEEP_FRAMES]
    );

    console.log(
        `[purge] user=${userId} frames=${count} -> kept ${PURGE_KEEP_FRAMES}, ` +
        `deleted ${detRes.rowCount} detections, ${recRes.rowCount} recommendations`
    );
    return detRes.rowCount;
}

/**
 * Count consecutive most-recent 'slouching'/'prolonged_slouching'
 * frames for a session — used to escalate slouching -> prolonged.
 */
export async function getConsecutiveBadCount(userId, sessionId) {
    const { rows } = await client_query_streak(userId, sessionId);
    return rows[0].streak;
}

async function client_query_streak(userId, sessionId) {
    return pool.query(
        `
        WITH ordered AS (
            SELECT posture_status,
                   ROW_NUMBER() OVER (ORDER BY detected_at DESC) AS rn
            FROM posture_detections
            WHERE user_id = $1 AND session_id = $2
        )
        SELECT COUNT(*)::int AS streak
        FROM ordered
        WHERE rn <= (SELECT COALESCE(MIN(rn), 0) FROM ordered
                     WHERE posture_status = 'good')
          AND posture_status <> 'good'
        `,
        [userId, sessionId]
    );
}

/**
 * Latest detection for a user (optionally filtered by session).
 */
export async function getLatestDetection(userId, sessionId = null) {
    const result = await pool.query(
        `
        SELECT * FROM posture_detections
        WHERE user_id = $1
          AND ($2::uuid IS NULL OR session_id = $2)
        ORDER BY detected_at DESC
        LIMIT 1
        `,
        [userId, sessionId]
    );
    return result.rows[0] || null;
}

/**
 * Paginated history for the dashboard.
 */
export async function getHistory({ userId, limit = 50, offset = 0, status = null }) {
    const result = await pool.query(
        `
        SELECT * FROM posture_detections
        WHERE user_id = $1
          AND ($2::text IS NULL OR posture_status = $2)
        ORDER BY detected_at DESC
        LIMIT $3 OFFSET $4
        `,
        [userId, status, limit, offset]
    );

    const total = await pool.query(
        `
        SELECT COUNT(*)::int AS count FROM posture_detections
        WHERE user_id = $1 AND ($2::text IS NULL OR posture_status = $2)
        `,
        [userId, status]
    );

    return { detections: result.rows, total: total.rows[0].count };
}

/**
 * Single detection (with its AI recommendations) — scoped to the user.
 */
export async function getHistoryById(userId, detectionId) {
    const result = await pool.query(
        `
        SELECT d.*,
               COALESCE(
                   json_agg(
                       json_build_object(
                           'recommendation_id', r.recommendation_id,
                           'recommendation_text', r.recommendation_text,
                           'confidence', r.confidence,
                           'model_used', r.model_used,
                           'generated_at', r.generated_at
                       ) ORDER BY r.generated_at DESC
                   ) FILTER (WHERE r.recommendation_id IS NOT NULL), '[]'
               ) AS recommendations
        FROM posture_detections d
        LEFT JOIN ai_recommendations r ON r.detection_id = d.detection_id
        WHERE d.user_id = $1 AND d.detection_id = $2
        GROUP BY d.detection_id
        `,
        [userId, detectionId]
    );
    return result.rows[0] || null;
}

/**
 * Used by the Ollama service: detections that don't have an
 * AI recommendation yet.
 */
export async function getDetectionsWithoutRecommendations(limit = 5) {
    const result = await pool.query(
        `
        SELECT d.*
        FROM posture_detections d
        LEFT JOIN ai_recommendations r ON r.detection_id = d.detection_id
        WHERE r.recommendation_id IS NULL
        ORDER BY d.detected_at DESC
        LIMIT $1
        `,
        [limit]
    );
    return result.rows;
}

export async function insertRecommendation({ detection_id, recommendation_text, confidence = null, model_used = null }) {
    const result = await pool.query(
        `
        INSERT INTO ai_recommendations
            (detection_id, recommendation_text, confidence, model_used)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [detection_id, recommendation_text, confidence, model_used]
    );
    return result.rows[0];
}
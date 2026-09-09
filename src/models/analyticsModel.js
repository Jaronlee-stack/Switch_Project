import pool from "../../dbConfig.js";

/**
 * Dashboard summary card data for one user.
 */
export async function getSummary(userId) {
    const result = await pool.query(
        `
        SELECT
            COUNT(*)::int                              AS total_detections,
            COUNT(DISTINCT session_id)::int            AS total_sessions,
            ROUND(AVG(posture_score)::numeric, 1)      AS avg_posture_score,
            COUNT(*) FILTER (WHERE posture_status = 'good')::int            AS good_count,
            COUNT(*) FILTER (WHERE posture_status = 'slouching')::int       AS slouching_count,
            COUNT(*) FILTER (WHERE posture_status = 'prolonged_slouching')::int AS prolonged_count,
            COUNT(*) FILTER (WHERE detected_at >= now() - interval '1 day')::int AS detections_today
        FROM posture_detections
        WHERE user_id = $1
        `,
        [userId]
    );

    const topIssue = await pool.query(
        `
        SELECT issue, COUNT(*)::int AS occurrences
        FROM posture_detections
        WHERE user_id = $1 AND issue IS NOT NULL
        GROUP BY issue
        ORDER BY occurrences DESC
        LIMIT 1
        `,
        [userId]
    );

    return { ...result.rows[0], top_issue: topIssue.rows[0] || null };
}

/**
 * Daily trend for charts (last N days).
 */
export async function getTrends(userId, days = 7) {
    const result = await pool.query(
        `
        SELECT
            DATE(detected_at) AS day,
            COUNT(*)::int     AS detections,
            ROUND(AVG(posture_score)::numeric, 1) AS avg_score,
            COUNT(*) FILTER (WHERE posture_status = 'good')::int AS good,
            COUNT(*) FILTER (WHERE posture_status <> 'good')::int AS bad
        FROM posture_detections
        WHERE user_id = $1
          AND detected_at >= now() - ($2::int * interval '1 day')
        GROUP BY DATE(detected_at)
        ORDER BY day ASC
        `,
        [userId, days]
    );
    return result.rows;
}
import pool from "../../dbConfig.js";

export async function listRules({ activeOnly = false } = {}) {
    const result = await pool.query(
        `
        SELECT * FROM rules_table
        WHERE ($1::boolean = false OR active = true)
        ORDER BY created_at ASC
        `,
        [activeOnly]
    );
    return result.rows;
}

/**
 * Match a posture status ('slouching', 'good', ...) to an active rule
 * by rule_name, case-insensitive.
 */
export async function findRuleByStatus(status) {
    const result = await pool.query(
        `
        SELECT * FROM rules_table
        WHERE lower(rule_name) = lower($1) AND active = true
        LIMIT 1
        `,
        [status]
    );
    return result.rows[0] || null;
}

export async function createRule({ rule_name, description, recommendation_text, robot_action = null }) {
    const result = await pool.query(
        `
        INSERT INTO rules_table (rule_name, description, recommendation_text, robot_action)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [rule_name, description, recommendation_text, robot_action]
    );
    return result.rows[0];
}

export async function updateRule(ruleId, { rule_name, description, recommendation_text, robot_action, active }) {
    const result = await pool.query(
        `
        UPDATE rules_table
        SET rule_name          = COALESCE($2, rule_name),
            description        = COALESCE($3, description),
            recommendation_text= COALESCE($4, recommendation_text),
            robot_action       = COALESCE($5, robot_action),
            active             = COALESCE($6, active)
        WHERE rule_id = $1
        RETURNING *
        `,
        [ruleId, rule_name, description, recommendation_text, robot_action, active]
    );
    return result.rows[0] || null;
}

export async function deleteRule(ruleId) {
    const result = await pool.query(
        `DELETE FROM rules_table WHERE rule_id = $1 RETURNING rule_id`,
        [ruleId]
    );
    return result.rows[0] || null;
}
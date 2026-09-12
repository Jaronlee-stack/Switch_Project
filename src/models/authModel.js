import pool from "../../dbConfig.js";

/**
 * Find a user by username/email.
 */
export async function findUserByUsername(username) {
    const result = await pool.query(
        `
        SELECT
            user_id,
            username,
            password_hash,
            role,
            created_at
        FROM users
        WHERE username = $1
        `,
        [username]
    );

    return result.rows[0] || null;
}

/**
 * Find a user by their UUID.
 */
export async function findUserById(userId) {
    const result = await pool.query(
        `
        SELECT
            user_id,
            username,
            role,
            created_at
        FROM users
        WHERE user_id = $1
        `,
        [userId]
    );

    return result.rows[0] || null;
}

/**
 * Create a new user.
 */
export async function createUser(username, passwordHash, role = "user") {
    const result = await pool.query(
        `
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, $3)
        RETURNING
            user_id,
            username,
            role,
            created_at
        `,
        [username, passwordHash, role]
    );

    return result.rows[0];
}

/**
 * Get all users.
 * Used by the superuser/admin route.
 */
export async function getAllUsers() {
    const result = await pool.query(
        `
        SELECT
            user_id,
            username,
            role,
            created_at
        FROM users
        ORDER BY created_at DESC
        `
    );

    return result.rows;
}

/**
 * Update a user's password.
 */
export async function updatePassword(userId, passwordHash) {
    const result = await pool.query(
        `
        UPDATE users
        SET password_hash = $1
        WHERE user_id = $2
        RETURNING
            user_id,
            username,
            role
        `,
        [passwordHash, userId]
    );

    return result.rows[0] || null;
}
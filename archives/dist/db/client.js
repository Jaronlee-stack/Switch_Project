"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseClient = void 0;
const pg_1 = __importDefault(require("pg"));
const { Pool } = pg_1.default;
class DatabaseClient {
    pool;
    config;
    constructor(config) {
        this.config = config;
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            max: config.max,
            idleTimeoutMillis: config.idleTimeoutMillis,
            connectionTimeoutMillis: config.connectionTimeoutMillis,
        });
        this.pool.on('error', (err) => {
            console.error('Unexpected database pool error:', err);
        });
    }
    async query(text, params) {
        const result = await this.pool.query(text, params);
        return result.rows;
    }
    async queryOne(text, params) {
        const result = await this.pool.query(text, params);
        return result.rows[0] ?? null;
    }
    async getLatestFrames(limit = 5) {
        const query = `
      SELECT 
        neck_angle,
        back_angle,
        head_forward_distance,
        posture_result,
        detected_at
      FROM posture_detections
      ORDER BY detected_at DESC
      LIMIT $1
    `;
        return this.query(query, [limit]);
    }
    async getSOPRules() {
        const query = `
      SELECT 
        rule_id,
        rule_name,
        min_angle,
        max_angle,
        result,
        recommendation,
        robot_action
      FROM rules_table
      ORDER BY rule_id
    `;
        return this.query(query);
    }
    async updateLatestAdvice(advice, confidence) {
        const query = `
      UPDATE posture_detections
      SET advice = $1, confidence_score = $2
      WHERE detection_id = (
        SELECT detection_id
        FROM posture_detections
        ORDER BY detected_at DESC
        LIMIT 1
      )
    `;
        await this.pool.query(query, [advice, confidence]);
    }
    async healthCheck() {
        try {
            await this.pool.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.DatabaseClient = DatabaseClient;
//# sourceMappingURL=client.js.map
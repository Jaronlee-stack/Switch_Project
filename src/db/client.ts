import pg from 'pg';
import { DatabaseConfig, PostureFrame, SOPRule, AveragedPosture } from '../types/index.js';

const { Pool } = pg;

export class DatabaseClient {
  private pool: pg.Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
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

  async query<T>(text: string, params?: unknown[]): Promise<T[]> {
    const result = await this.pool.query(text, params);
    return result.rows as T[];
  }

  async queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
    const result = await this.pool.query(text, params);
    return (result.rows[0] as T) ?? null;
  }

  async getLatestFrames(limit: number = 5): Promise<PostureFrame[]> {
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
    return this.query<PostureFrame>(query, [limit]);
  }

  async getSOPRules(): Promise<SOPRule[]> {
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
    return this.query<SOPRule>(query);
  }

  async updateLatestAdvice(advice: string, confidence: number): Promise<void> {
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

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
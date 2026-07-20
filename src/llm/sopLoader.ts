import { SOPRule } from '../types/index.js';
import { DatabaseClient } from '../db/client.js';

export class SOPLoader {
  private cache: SOPRule[] | null = null;
  private dbClient: DatabaseClient;

  constructor(dbClient: DatabaseClient) {
    this.dbClient = dbClient;
  }

  async load(): Promise<SOPRule[]> {
    if (this.cache !== null) {
      return this.cache;
    }

    const rules = await this.dbClient.getSOPRules();
    this.cache = rules;
    return rules;
  }

  getCached(): SOPRule[] | null {
    return this.cache;
  }

  invalidate(): void {
    this.cache = null;
  }

  formatForPrompt(rules: SOPRule[]): string {
    return rules
      .map(
        (rule) =>
          `Rule: ${rule.rule_name} | Angle Range: ${rule.min_angle}-${rule.max_angle}° | Result: ${rule.result} | Recommendation: ${rule.recommendation} | Action: ${rule.robot_action ?? 'None'}`
      )
      .join('\n');
  }
}
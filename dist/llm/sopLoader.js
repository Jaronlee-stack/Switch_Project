"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOPLoader = void 0;
class SOPLoader {
    cache = null;
    dbClient;
    constructor(dbClient) {
        this.dbClient = dbClient;
    }
    async load() {
        if (this.cache !== null) {
            return this.cache;
        }
        const rules = await this.dbClient.getSOPRules();
        this.cache = rules;
        return rules;
    }
    getCached() {
        return this.cache;
    }
    invalidate() {
        this.cache = null;
    }
    formatForPrompt(rules) {
        return rules
            .map((rule) => `Rule: ${rule.rule_name} | Angle Range: ${rule.min_angle}-${rule.max_angle}° | Result: ${rule.result} | Recommendation: ${rule.recommendation} | Action: ${rule.robot_action ?? 'None'}`)
            .join('\n');
    }
}
exports.SOPLoader = SOPLoader;
//# sourceMappingURL=sopLoader.js.map
import { SOPRule } from '../types/index.js';
import { DatabaseClient } from '../db/client.js';
export declare class SOPLoader {
    private cache;
    private dbClient;
    constructor(dbClient: DatabaseClient);
    load(): Promise<SOPRule[]>;
    getCached(): SOPRule[] | null;
    invalidate(): void;
    formatForPrompt(rules: SOPRule[]): string;
}
//# sourceMappingURL=sopLoader.d.ts.map